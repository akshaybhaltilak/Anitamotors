import React, { useState, useEffect } from 'react';
import { database } from '../../Database/firebaseconfig';
import { ref, set, onValue, remove, update, push } from 'firebase/database';

const Vehicle = () => {
  // States for vehicle data
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    model: '',
    quantity: 0,
    colors: '',
    price: 0,
    specifications: '',
    fuelType: '',
    engineCapacity: '',
    transmission: 'automatic',
    id: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('name');

  // States for sell form
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellData, setSellData] = useState({
    vehicleId: '',
    quantity: 1,
    customerName: '',
    customerContact: '',
    sellingPrice: 0,
    date: new Date().toISOString().split('T')[0]
  });

  // Fetch vehicles from Firebase
  useEffect(() => {
    const vehiclesRef = ref(database, 'vehicles');
    onValue(vehiclesRef, (snapshot) => {
      const data = snapshot.val();
      const vehiclesList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setVehicles(vehiclesList);
      setFilteredVehicles(vehiclesList);
    });
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'quantity' || name === 'price'
        ? parseFloat(value) || 0
        : value
    });
  };

  // Handle submit for adding/editing vehicle
  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEditing && formData.id) {
      // Update existing vehicle
      update(ref(database, `vehicles/${formData.id}`), {
        name: formData.name,
        category: formData.category,
        model: formData.model,
        quantity: formData.quantity,
        colors: formData.colors,
        price: formData.price,
        specifications: formData.specifications,
        fuelType: formData.fuelType,
        engineCapacity: formData.engineCapacity,
        transmission: formData.transmission,
      });
    } else {
      // Add new vehicle
      const newVehicleKey = push(ref(database, 'vehicles')).key;
      set(ref(database, `vehicles/${newVehicleKey}`), {
        name: formData.name,
        category: formData.category,
        model: formData.model,
        quantity: formData.quantity,
        colors: formData.colors,
        price: formData.price,
        specifications: formData.specifications,
        fuelType: formData.fuelType,
        engineCapacity: formData.engineCapacity,
        transmission: formData.transmission,
        dateAdded: new Date().toISOString()
      });
    }

    // Reset form
    resetForm();
  };

  // Reset the form fields
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      model: '',
      quantity: 0,
      colors: '',
      price: 0,
      specifications: '',
      fuelType: '',
      engineCapacity: '',
      transmission: 'automatic',
      id: null
    });
    setIsEditing(false);
  };

  // Edit a vehicle
  const handleEdit = (vehicle) => {
    setFormData({
      ...vehicle,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete a vehicle
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      remove(ref(database, `vehicles/${id}`));
    }
  };

  // Search functionality
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const filtered = vehicles.filter(vehicle => {
        if (searchFilter === 'all') {
          return Object.values(vehicle).some(value =>
            value && value.toString().toLowerCase().includes(query)
          );
        } else {
          return vehicle[searchFilter] &&
            vehicle[searchFilter].toString().toLowerCase().includes(query);
        }
      });
      setFilteredVehicles(filtered);
    }
  };

  // Handle sell form input changes
  const handleSellInputChange = (e) => {
    const { name, value } = e.target;
    setSellData({
      ...sellData,
      [name]: name === 'quantity' || name === 'sellingPrice'
        ? parseFloat(value) || 0
        : value
    });

    // Update selling price when vehicle is selected
    if (name === 'vehicleId') {
      const selectedVehicle = vehicles.find(v => v.id === value);
      if (selectedVehicle) {
        setSellData(prev => ({
          ...prev,
          sellingPrice: selectedVehicle.price
        }));
      }
    }
  };

  // Handle sell form submission
  const handleSellSubmit = (e) => {
    e.preventDefault();

    // Validate form
    if (!sellData.vehicleId || sellData.quantity <= 0 || !sellData.customerName) {
      alert('Please fill all required fields');
      return;
    }

    // Find the vehicle
    const vehicleToSell = vehicles.find(v => v.id === sellData.vehicleId);

    // Check if enough quantity is available
    if (vehicleToSell.quantity < sellData.quantity) {
      alert(`Not enough vehicles in stock. Only ${vehicleToSell.quantity} available.`);
      return;
    }

    // Add sale record
    const newSaleKey = push(ref(database, 'sales')).key;
    set(ref(database, `sales/${newSaleKey}`), {
      ...sellData,
      vehicleName: vehicleToSell.name,
      vehicleModel: vehicleToSell.model,
      date: sellData.date,
      timestamp: new Date().toISOString()
    });

    // Update vehicle quantity
    update(ref(database, `vehicles/${sellData.vehicleId}`), {
      quantity: vehicleToSell.quantity - sellData.quantity
    });

    // Reset sell form
    setSellData({
      vehicleId: '',
      quantity: 1,
      customerName: '',
      customerContact: '',
      sellingPrice: 0,
      date: new Date().toISOString().split('T')[0]
    });

    setShowSellForm(false);
    alert('Sale recorded successfully!');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <header className=" text-black p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <button
            onClick={() => setShowSellForm(!showSellForm)}
            className="bg-gradient-to-r from-green-500 to-green-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-100 transition-colors"
          >
            {showSellForm ? 'Manage Inventory' : 'Record Sale'}
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8">
        {showSellForm ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-green-700 mb-4">Record New Sale</h2>
            <form onSubmit={handleSellSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Select Vehicle*</label>
                  <select
                    name="vehicleId"
                    value={sellData.vehicleId}
                    onChange={handleSellInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(vehicle => (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                        disabled={vehicle.quantity < 1}
                      >
                        {vehicle.name} - {vehicle.model} ({vehicle.quantity} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Quantity*</label>
                  <input
                    type="number"
                    name="quantity"
                    value={sellData.quantity}
                    onChange={handleSellInputChange}
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Customer Name*</label>
                  <input
                    type="text"
                    name="customerName"
                    value={sellData.customerName}
                    onChange={handleSellInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Customer Contact</label>
                  <input
                    type="text"
                    name="customerContact"
                    value={sellData.customerContact}
                    onChange={handleSellInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Selling Price*</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={sellData.sellingPrice}
                    onChange={handleSellInputChange}
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Sale Date*</label>
                  <input
                    type="date"
                    name="date"
                    value={sellData.date}
                    onChange={handleSellInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSellForm(false)}
                  className="px-4 py-2 mr-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Vehicle Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold text-green-700 mb-4">
                {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Vehicle Name*</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Category*</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">-- Select Category --</option>
                      <option value="Car">Car</option>
                      <option value="Bike">Bike</option>
                      <option value="Scooter">Scooter</option>
                      <option value="SUV">SUV</option>
                      <option value="Truck">Truck</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Model*</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Quantity*</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Available Colors*</label>
                    <input
                      type="text"
                      name="colors"
                      value={formData.colors}
                      onChange={handleInputChange}
                      placeholder="Red, Black, White, etc."
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Price (₹)*</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Fuel Type</label>
                    <select
                      name="fuelType"
                      value={formData.fuelType}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">-- Select Fuel Type --</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Engine Capacity</label>
                    <input
                      type="text"
                      name="engineCapacity"
                      value={formData.engineCapacity}
                      onChange={handleInputChange}
                      placeholder="e.g. 1500cc, 50kW"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Transmission</label>
                    <select
                      name="transmission"
                      value={formData.transmission}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                      <option value="cvt">CVT</option>
                      <option value="n/a">N/A</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-gray-700 mb-2">Specifications & Features</label>
                  <textarea
                    name="specifications"
                    value={formData.specifications}
                    onChange={handleInputChange}
                    placeholder="Enter specifications, features and other details..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 h-32"
                  ></textarea>
                </div>

                <div className="mt-6 flex justify-end">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 mr-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
                  </button>
                </div>
              </form>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                  <input
                    type="text"
                    placeholder="Search vehicles..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <select
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full md:w-48 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Fields</option>
                    <option value="name">Name</option>
                    <option value="model">Model</option>
                    <option value="category">Category</option>
                    <option value="colors">Color</option>
                    <option value="fuelType">Fuel Type</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vehicle List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.length > 0 ? filteredVehicles.map(vehicle => (
                <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-green-500 to-green-700 p-4 text-white">
                    <h3 className="text-xl font-bold mb-1">{vehicle.name}</h3>
                    <p className="text-sm opacity-90">{vehicle.category} • {vehicle.model}</p>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-lg text-green-800">₹{vehicle.price.toLocaleString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${vehicle.quantity > 10 ? 'bg-green-100 text-green-800' :
                          vehicle.quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {vehicle.quantity > 0 ? `${vehicle.quantity} in stock` : 'Out of stock'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <span className="text-gray-600">Colors:</span>
                        <p>{vehicle.colors}</p>
                      </div>
                      {vehicle.fuelType && (
                        <div>
                          <span className="text-gray-600">Fuel:</span>
                          <p>{vehicle.fuelType}</p>
                        </div>
                      )}
                      {vehicle.engineCapacity && (
                        <div>
                          <span className="text-gray-600">Engine:</span>
                          <p>{vehicle.engineCapacity}</p>
                        </div>
                      )}
                      {vehicle.transmission && (
                        <div>
                          <span className="text-gray-600">Transmission:</span>
                          <p className="capitalize">{vehicle.transmission}</p>
                        </div>
                      )}
                    </div>

                    {vehicle.specifications && (
                      <div className="text-sm mb-4">
                        <span className="text-gray-600">Specifications:</span>
                        <p className="text-gray-700 line-clamp-2">{vehicle.specifications}</p>
                      </div>
                    )}

                    <div className="flex justify-between mt-4">
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => navigate(`/vehicles/${vehicle.id}/details`)}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        disabled={vehicle.quantity < 1}
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 bg-white rounded-lg shadow-md p-8 text-center">
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No vehicles found</h3>
                  <p className="text-gray-500">Try adjusting your search or add new vehicles to your inventory.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Vehicle;