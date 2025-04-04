import React, { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove, get } from 'firebase/database';
import { database } from '../../Database/firebaseconfig';

function Servicing() {
  const [services, setServices] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParts, setSelectedParts] = useState([]);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
    bikeModel: '',
    batteryHealth: '',
    serviceType: 'Regular Maintenance',
    serviceCategory: 'Paid', // New field: Free, Paid, or Instant
    paymentStatus: 'Pending', // New field
    paymentAmount: 0, // New field
    paymentMethod: 'Cash', // New field
    description: '',
    date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
    status: 'Pending',
    spareParts: [], // New field to store selected spare parts
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  // Fetch services data from Firebase on component mount
  useEffect(() => {
    const servicesRef = ref(database, 'bikeServices');
    const unsubscribe = onValue(servicesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const servicesList = Object.keys(data).map((id) => ({ id, ...data[id] }));

      // Sort by date (newest first)
      servicesList.sort((a, b) => new Date(b.date) - new Date(a.date));

      setServices(servicesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch spare parts data from Firebase
  useEffect(() => {
    const sparePartsRef = ref(database, 'spareParts');
    const unsubscribe = onValue(sparePartsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const sparePartsList = Object.keys(data).map((id) => ({ id, ...data[id] }));
      setSpareParts(sparePartsList);
    });

    return () => unsubscribe();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'serviceCategory') {
      let updatedPaymentStatus = formData.paymentStatus;
      
      // If service is free, automatically set payment status to 'Not Required'
      if (value === 'Free') {
        updatedPaymentStatus = 'Not Required';
      } else if (formData.serviceCategory === 'Free') {
        // If changing from Free to something else, reset payment status to Pending
        updatedPaymentStatus = 'Pending';
      }
      
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
        paymentStatus: updatedPaymentStatus,
        paymentAmount: value === 'Free' ? 0 : prevState.paymentAmount,
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      // Update spare parts inventory quantities
      if (selectedParts.length > 0) {
        for (const part of selectedParts) {
          const partRef = ref(database, `spareParts/₹{part.id}`);
          const snapshot = await get(partRef);
          const currentPart = snapshot.val();
          
          if (currentPart) {
            const newQuantity = currentPart.quantity - part.quantity;
            
            if (newQuantity >= 0) {
              await update(partRef, {
                quantity: newQuantity
              });
            } else {
              throw new Error(`Not enough quantity for ₹{part.name}`);
            }
          }
        }
      }

      // Prepare service data with selected parts
      const serviceData = {
        ...formData,
        spareParts: selectedParts.map(part => ({
          id: part.id,
          name: part.name,
          quantity: part.quantity,
          price: part.price
        }))
      };

      if (isEditing && editId) {
        // Update existing record
        const serviceRef = ref(database, `bikeServices/${editId}`);
        await update(serviceRef, serviceData);
        showSuccessMessage('Service updated successfully!');
      } else {
        // Add new record
        const servicesRef = ref(database, 'bikeServices');
        await push(servicesRef, {
          ...serviceData,
          timestamp: Date.now(),
        });
        showSuccessMessage('Service scheduled successfully!');
      }
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Show success message temporarily
  const showSuccessMessage = (message) => {
    setSubmitSuccess(message);
    setTimeout(() => {
      setSubmitSuccess(false);
    }, 3000);
  };

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      customerName: '',
      phone: '',
      email: '',
      bikeModel: '',
      batteryHealth: '',
      serviceType: 'Regular Maintenance',
      serviceCategory: 'Paid',
      paymentStatus: 'Pending',
      paymentAmount: 0,
      paymentMethod: 'Cash',
      description: '',
      date: new Date().toLocaleDateString('en-CA'),
      status: 'Pending',
      spareParts: [],
    });
    setSelectedParts([]);
    setIsEditing(false);
    setEditId(null);
  };

  // Delete a service record
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service record?')) {
      try {
        const serviceRef = ref(database, `bikeServices/${id}`);
        await remove(serviceRef);
        showSuccessMessage('Service record deleted');
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  // Edit a service record
  const handleEdit = (service) => {
    setFormData({
      ...service,
      spareParts: service.spareParts || [],
    });
    setSelectedParts(service.spareParts || []);
    setIsEditing(true);
    setEditId(service.id);

    // Scroll to form
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Change service status
  const handleStatusChange = async (id, newStatus) => {
    try {
      const serviceRef = ref(database, `bikeServices/${id}`);
      await update(serviceRef, { status: newStatus });
      showSuccessMessage(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Handle spare part selection
  const handleAddPart = (part) => {
    const existingPartIndex = selectedParts.findIndex(p => p.id === part.id);
    
    if (existingPartIndex >= 0) {
      // Part already added, increase quantity
      const updatedParts = [...selectedParts];
      updatedParts[existingPartIndex].quantity += 1;
      setSelectedParts(updatedParts);
    } else {
      // Add new part with quantity 1
      setSelectedParts([...selectedParts, { ...part, quantity: 1 }]);
    }
  };

  // Handle spare part quantity change
  const handlePartQuantityChange = (partId, newQuantity) => {
    const updatedParts = selectedParts.map(part => {
      if (part.id === partId) {
        return { ...part, quantity: parseInt(newQuantity) || 0 };
      }
      return part;
    });
    setSelectedParts(updatedParts);
  };

  // Remove spare part from selection
  const handleRemovePart = (partId) => {
    setSelectedParts(selectedParts.filter(part => part.id !== partId));
  };

  // Calculate total parts cost
  const calculateTotalPartsCost = () => {
    return selectedParts.reduce((total, part) => {
      return total + (part.price * part.quantity);
    }, 0);
  };

  // Filter services based on status
  const filteredServices =
    filter === 'all'
      ? services
      : services.filter((service) => service.status === filter);

  return (
    <div className="bg-gray-100 min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Service Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-100 transition-all hover:shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {isEditing ? 'Edit Service Request' : 'New Service Request'}
              </h2>

              {submitSuccess && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        {submitSuccess}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Customer Name*
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Phone*
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {/* <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div> */}
                </div>

                {/* <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Bike Model*
                  </label>
                  <input
                    type="text"
                    name="bikeModel"
                    value={formData.bikeModel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div> */}

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Battery Health (%)
                  </label>
                  <input
                    type="number"
                    name="batteryHealth"
                    value={formData.batteryHealth}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Service Type*
                    </label>
                    <select
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Regular Maintenance">Regular Maintenance</option>
                      <option value="Battery Service">Battery Service</option>
                      <option value="Motor Repair">Motor Repair</option>
                      <option value="Controller Issues">Controller Issues</option>
                      <option value="Brake System">Brake System</option>
                      <option value="Software Update">Software Update</option>
                      <option value="Full Inspection">Full Inspection</option>
                      <option value="Other">Other</option>
                    </select>
                  </div> */}
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Service Category*
                    </label>
                    <select
                      name="serviceCategory"
                      value={formData.serviceCategory}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Free">Free</option>
                      <option value="Paid">Paid</option>
                      <option value="Instant">Instant</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Service Date*
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Description of Issue
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                {/* Spare Parts Section */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-gray-700 text-sm font-medium">
                      Spare Parts
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPartsModal(true)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add Parts
                    </button>
                  </div>
                  
                  {selectedParts.length > 0 ? (
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedParts.map((part) => (
                            <tr key={part.id}>
                              <td className="px-2 py-2 text-sm text-gray-900">{part.name}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={part.quantity || 999}
                                  value={part.quantity}
                                  onChange={(e) => handlePartQuantityChange(part.id, e.target.value)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 text-sm text-right text-gray-900">₹{part.price}</td>
                              <td className="px-2 py-2 text-sm text-right text-gray-900">₹{(part.price * part.quantity).toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePart(part.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300">
                            <td colSpan="3" className="px-2 py-2 text-sm font-medium text-gray-900 text-right">Total Parts Cost:</td>
                            <td className="px-2 py-2 text-sm font-medium text-gray-900 text-right">₹{calculateTotalPartsCost().toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-md border border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No spare parts added</p>
                    </div>
                  )}
                </div>

                {/* Payment Section - Only show if not Free */}
                {formData.serviceCategory !== 'Free' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="font-medium text-gray-700 mb-3">Payment Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-1">
                          Payment Status
                        </label>
                        <select
                          name="paymentStatus"
                          value={formData.paymentStatus}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Partially Paid">Partially Paid</option>
                        </select>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-1">
                          Payment Method
                        </label>
                        <select
                          name="paymentMethod"
                          value={formData.paymentMethod}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="UPI">UPI</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Service Charge Amount (₹)
                      </label>
                      <input
                        type="number"
                        name="paymentAmount"
                        value={formData.paymentAmount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-md flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Amount</p>
                        <p className="text-gray-500 text-xs">Service charge + parts</p>
                      </div>
                      <div className="text-xl font-semibold text-blue-800">
                      ₹{(parseFloat(formData.paymentAmount || 0) + calculateTotalPartsCost()).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4 mt-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsEditing(false);
                      setEditId(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      submitLoading 
                        ? 'bg-blue-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1'
                    }`}
                  >
                    {submitLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : isEditing ? (
                      'Update Service'
                    ) : (
                      'Schedule Service'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Service Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Service Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 transform transition-transform hover:scale-105">
                  <p className="text-sm text-blue-600 font-medium">Total Services</p>
                  <p className="text-2xl font-bold">{services.length}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 transform transition-transform hover:scale-105">
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold">{services.filter(s => s.status === 'Pending').length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 transform transition-transform hover:scale-105">
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold">{services.filter(s => s.status === 'Completed').length}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 transform transition-transform hover:scale-105">
                  <p className="text-sm text-purple-600 font-medium">In Progress</p>
                  <p className="text-2xl font-bold">{services.filter(s => s.status === 'In Progress').length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Service List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Service Records
                </h2>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('Pending')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filter === 'Pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilter('In Progress')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filter === 'In Progress'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => setFilter('Completed')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filter === 'Completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <svg className="animate-spin h-10 w-10 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-3 text-gray-600">Loading service records...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="mt-4 text-lg font-medium text-gray-600">No service records found</p>
                  <p className="mt-2 text-gray-500">Schedule a new service to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bike Model</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredServices.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{service.customerName}</p>
                                <p className="text-xs text-gray-500">{service.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{service.bikeModel}</td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {service.serviceType}
                              </span>
                              {service.serviceCategory && (
                                <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  service.serviceCategory === 'Free' 
                                    ? 'bg-green-100 text-green-800'
                                    : service.serviceCategory === 'Instant'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {service.serviceCategory}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{service.date}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                service.status === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : service.status === 'In Progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : service.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {service.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {service.serviceCategory === 'Free' ? (
                              <span className="text-gray-500">N/A</span>
                            ) : (
                              <div>
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    service.paymentStatus === 'Completed'
                                      ? 'bg-green-100 text-green-800'
                                      : service.paymentStatus === 'Partially Paid'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {service.paymentStatus}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">
                                  ${((parseFloat(service.paymentAmount) || 0) + 
                                    (service.spareParts ? service.spareParts.reduce((total, part) => 
                                      total + (part.price * part.quantity), 0) : 0)).toFixed(2)}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(service)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(service.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <div className="relative inline-block text-left" title="Status">
                                <button
                                  className="text-gray-600 hover:text-gray-900 focus:outline-none"
                                  onClick={() => {
                                    const newStatus = service.status === 'Pending' 
                                      ? 'In Progress' 
                                      : service.status === 'In Progress' 
                                        ? 'Completed' 
                                        : 'Pending';
                                    handleStatusChange(service.id, newStatus);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spare Parts Selection Modal */}
      {showPartsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Select Spare Parts</h3>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search parts..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                      />
                      
                      {spareParts.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No spare parts available</p>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {spareParts.map((part) => (
                                <tr key={part.id}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{part.name}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{part.quantity}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">${part.price}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleAddPart(part)}
                                      disabled={part.quantity <= 0}
                                      className={`px-3 py-1 rounded-md text-white ${
                                        part.quantity <= 0
                                          ? 'bg-gray-300 cursor-not-allowed'
                                          : 'bg-blue-600 hover:bg-blue-700'
                                      }`}
                                    >
                                      Add
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowPartsModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Servicing;