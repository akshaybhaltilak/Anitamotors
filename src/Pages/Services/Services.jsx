import React, { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove, get } from 'firebase/database';
import { database } from '../../Database/firebaseconfig';

function Servicing() {
  const [services, setServices] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParts, setSelectedParts] = useState([]);
  const [originalParts, setOriginalParts] = useState([]);

  const [formData, setFormData] = useState({
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
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [expandedService, setExpandedService] = useState(null);

  // Fetch services data from Firebase on component mount
  useEffect(() => {
    const servicesRef = ref(database, 'bikeServices');
    const unsubscribe = onValue(servicesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const servicesList = Object.keys(data).map((id) => ({ id, ...data[id] }));
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

      if (value === 'Free') {
        updatedPaymentStatus = 'Not Required';
      } else if (formData.serviceCategory === 'Free') {
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

  // Restore inventory for original parts
  const restoreOriginalPartsInventory = async () => {
    if (originalParts.length > 0) {
      for (const part of originalParts) {
        const partRef = ref(database, `spareParts/${part.id}`);
        const snapshot = await get(partRef);
        const currentPart = snapshot.val();

        if (currentPart) {
          const restoredQuantity = currentPart.quantity + part.quantity;
          await update(partRef, {
            quantity: restoredQuantity
          });
        }
      }
    }
  };

  // Deduct inventory for new parts
  const deductPartsInventory = async (parts) => {
    for (const part of parts) {
      const partRef = ref(database, `spareParts/${part.id}`);
      const snapshot = await get(partRef);
      const currentPart = snapshot.val();

      if (currentPart) {
        const newQuantity = currentPart.quantity - part.quantity;

        if (newQuantity < 0) {
          throw new Error(`Not enough quantity for ${part.name}. Available: ${currentPart.quantity}, Required: ${part.quantity}`);
        }

        await update(partRef, {
          quantity: newQuantity
        });
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
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
        await restoreOriginalPartsInventory();
        if (selectedParts.length > 0) {
          await deductPartsInventory(selectedParts);
        }
        const serviceRef = ref(database, `bikeServices/${editId}`);
        await update(serviceRef, serviceData);
        showSuccessMessage('Service updated successfully!');
      } else {
        if (selectedParts.length > 0) {
          await deductPartsInventory(selectedParts);
        }
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
    setOriginalParts([]);
    setIsEditing(false);
    setEditId(null);
  };

  // Delete a service record
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service record?')) {
      try {
        const serviceRef = ref(database, `bikeServices/${id}`);
        const snapshot = await get(serviceRef);
        const serviceData = snapshot.val();

        if (serviceData && serviceData.spareParts) {
          for (const part of serviceData.spareParts) {
            const partRef = ref(database, `spareParts/${part.id}`);
            const partSnapshot = await get(partRef);
            const currentPart = partSnapshot.val();

            if (currentPart) {
              const restoredQuantity = currentPart.quantity + part.quantity;
              await update(partRef, {
                quantity: restoredQuantity
              });
            }
          }
        }

        await remove(serviceRef);
        showSuccessMessage('Service record deleted and inventory restored');
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('Error deleting service record');
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
    setOriginalParts(service.spareParts || []);
    setIsEditing(true);
    setEditId(service.id);
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
      const updatedParts = [...selectedParts];
      updatedParts[existingPartIndex].quantity += 1;
      setSelectedParts(updatedParts);
    } else {
      setSelectedParts([...selectedParts, { ...part, quantity: 1 }]);
    }
  };

  // Handle spare part quantity change
  const handlePartQuantityChange = (partId, newQuantity) => {
    const quantity = parseInt(newQuantity) || 0;
    if (quantity < 0) return;

    const updatedParts = selectedParts.map(part => {
      if (part.id === partId) {
        return { ...part, quantity: quantity };
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

  // Get available quantity for a part
  const getAvailableQuantity = (partId) => {
    const sparePartData = spareParts.find(p => p.id === partId);
    if (!sparePartData) return 0;

    let availableStock = sparePartData.quantity;
    if (isEditing) {
      const originalPart = originalParts.find(p => p.id === partId);
      if (originalPart) {
        availableStock += originalPart.quantity;
      }
    }

    return availableStock;
  };

  // Filter services based on status and search term
  const filteredServices = services.filter((service) => {
    const matchesFilter = filter === 'all' || service.status === filter;
    const matchesSearch = service.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Toggle service card expansion
  const toggleServiceExpansion = (id) => {
    setExpandedService(expandedService === id ? null : id);
  };

  // Update the filteredSpareParts logic to make search more robust
  const filteredSpareParts = spareParts.filter(part => {
    const searchLower = partsSearchTerm.toLowerCase().trim();
    if (!searchLower) return true; // Show all parts if search is empty

    return (
      part.name?.toLowerCase().includes(searchLower) ||
      part.description?.toLowerCase().includes(searchLower) ||
      part.id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-gray-100 min-h-screen pb-10">
      <div className="mx-auto px-4">
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
                  <div className="mb-4">
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Bike Model
                    </label>
                    <input
                      type="text"
                      name="bikeModel"
                      value={formData.bikeModel}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Service Type
                    </label>
                    <select
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Regular Maintenance">Regular Maintenance</option>
                      <option value="Battery Service">Battery Service</option>
                      <option value="Tire Service">Tire Service</option>
                      <option value="Brake Service">Brake Service</option>
                      <option value="Electrical Service">Electrical Service</option>
                      <option value="Other">Other</option>
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
                                  max={getAvailableQuantity(part.id)}
                                  value={part.quantity}
                                  onChange={(e) => handlePartQuantityChange(part.id, e.target.value)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                  Max: {getAvailableQuantity(part.id)}
                                </div>
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
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${submitLoading
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
                Service Statistics
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-800">{services.length}</div>
                  <div className="text-blue-600 text-sm">Total Services</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">
                    {services.filter(s => s.status === 'Completed').length}
                  </div>
                  <div className="text-green-600 text-sm">Completed</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-800">
                    {services.filter(s => s.status === 'In Progress').length}
                  </div>
                  <div className="text-yellow-600 text-sm">In Progress</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-800">
                    {services.filter(s => s.status === 'Pending').length}
                  </div>
                  <div className="text-red-600 text-sm">Pending</div>
                </div>
              </div>
            </div>
          </div>

          {/* Services List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4 sm:mb-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H5" />
                  </svg>
                  Service Records ({filteredServices.length})
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter('Pending')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === 'Pending'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setFilter('In Progress')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === 'In Progress'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => setFilter('Completed')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === 'Completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-600">Loading services...</span>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new service request.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{service.customerName}</h3>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${service.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                service.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                  service.status === 'Pending' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {service.status}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${service.serviceCategory === 'Free' ? 'bg-blue-100 text-blue-800' :
                                service.serviceCategory === 'Paid' ? 'bg-purple-100 text-purple-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                {service.serviceCategory}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {service.phone}
                            </div>
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                              </svg>
                              {service.bikeModel || 'Not specified'}
                            </div>
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                              </svg>
                              {service.serviceType}
                            </div>
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                              </svg>
                              {service.date}
                            </div>
                          </div>

                          {service.description && (
                            <p className="text-sm text-gray-600 mb-3 bg-white p-2 rounded border">
                              {service.description}
                            </p>
                          )}

                          {service.spareParts && service.spareParts.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Spare Parts:</h4>
                              <div className="bg-white p-2 rounded border">
                                {service.spareParts.map((part, index) => (
                                  <div key={index} className="flex justify-between items-center text-sm">
                                    <span>{part.name} (x{part.quantity})</span>
                                    <span className="font-medium">₹{(part.price * part.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {service.serviceCategory !== 'Free' && (
                            <div className="bg-white p-3 rounded border mb-3">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Payment Status:</span>
                                <span className={`font-medium ${service.paymentStatus === 'Completed' ? 'text-green-600' :
                                  service.paymentStatus === 'Partially Paid' ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                  {service.paymentStatus}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="font-semibold text-lg">
                                  ₹{(
                                    parseFloat(service.paymentAmount || 0) +
                                    (service.spareParts || []).reduce((total, part) => total + (part.price * part.quantity), 0)
                                  ).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                <span>Method: {service.paymentMethod}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-4 sm:mt-0 sm:ml-4">
                          <select
                            value={service.status}
                            onChange={(e) => handleStatusChange(service.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(service)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(service.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spare Parts Selection Modal */}
      {showPartsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Spare Parts</h3>
                <button
                  onClick={() => setShowPartsModal(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search spare parts..."
                    value={partsSearchTerm}
                    onChange={(e) => setPartsSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredSpareParts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No spare parts found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSpareParts.map((part) => {
                      const availableQty = getAvailableQuantity(part.id);
                      const isSelected = selectedParts.find(p => p.id === part.id);

                      return (
                        <div key={part.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{part.name}</h4>
                            <p className="text-sm text-gray-500">{part.description}</p>
                            <div className="flex items-center mt-1 space-x-4">
                              <span className="text-sm font-medium text-green-600">₹{part.price}</span>
                              <span className="text-sm text-gray-500">Stock: {availableQty}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isSelected && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Added: {isSelected.quantity}
                              </span>
                            )}
                            <button
                              onClick={() => handleAddPart(part)}
                              disabled={availableQty <= 0 || (isSelected && isSelected.quantity >= availableQty)}
                              className={`px-3 py-1 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${availableQty <= 0 || (isSelected && isSelected.quantity >= availableQty)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                                }`}
                            >
                              {availableQty <= 0 ? 'Out of Stock' : 'Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPartsModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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