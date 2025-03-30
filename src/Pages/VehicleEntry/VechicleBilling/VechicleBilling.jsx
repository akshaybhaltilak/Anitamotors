import React, { useState, useEffect } from 'react';
import { database } from '../../../Database/firebaseconfig';
import { ref, set, onValue, remove, update, push, get, child } from 'firebase/database';
import { useParams, useNavigate } from 'react-router-dom';

const VehicleBilling = () => {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unitDetails, setUnitDetails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('motorNumber');
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({
    motorNumber: '',
    chassisNumber: '',
    batteryNumber: '',
    controllerNumber: '',
    status: 'in-stock', // in-stock, sold, reserved
    addedOn: new Date().toISOString()
  });

  const { vehicleId } = useParams();
  const navigate = useNavigate();

  // Fetch vehicle data
  useEffect(() => {
    if (!vehicleId) return;
    
    const fetchVehicleData = async () => {
      setLoading(true);
      const vehicleRef = ref(database, `vehicles/${vehicleId}`);
      
      onValue(vehicleRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setVehicle(data);
        } else {
          // Vehicle not found
          alert('Vehicle not found!');
          navigate('/vehicles');
        }
        setLoading(false);
      });
    };

    const fetchUnitDetails = async () => {
      const unitsRef = ref(database, `vehicleUnits/${vehicleId}`);
      
      onValue(unitsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const unitsArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          setUnitDetails(unitsArray);
        } else {
          setUnitDetails([]);
        }
      });
    };

    fetchVehicleData();
    fetchUnitDetails();
  }, [vehicleId, navigate]);

  // Handle unit input changes
  const handleUnitInputChange = (e) => {
    const { name, value } = e.target;
    setNewUnit(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new unit
  const handleAddUnit = async (e) => {
    e.preventDefault();
    
    // Check if motor number already exists
    const isDuplicate = unitDetails.some(unit => 
      unit.motorNumber.toLowerCase() === newUnit.motorNumber.toLowerCase());
      
    if (isDuplicate) {
      alert('A unit with this motor number already exists!');
      return;
    }

    // Check if we've reached the quantity limit
    if (unitDetails.length >= vehicle.quantity) {
      alert(`You already have ${vehicle.quantity} units recorded for this vehicle. Please update the vehicle quantity first.`);
      return;
    }

    try {
      const newUnitKey = push(ref(database, `vehicleUnits/${vehicleId}`)).key;
      await set(ref(database, `vehicleUnits/${vehicleId}/${newUnitKey}`), {
        ...newUnit,
        addedOn: new Date().toISOString()
      });

      // Reset form
      setNewUnit({
        motorNumber: '',
        chassisNumber: '',
        batteryNumber: '',
        controllerNumber: '',
        status: 'in-stock',
        addedOn: new Date().toISOString()
      });
      
      setIsAddingUnit(false);
    } catch (error) {
      console.error("Error adding unit:", error);
      alert('Failed to add unit. Please try again.');
    }
  };

  // Delete unit
  const handleDeleteUnit = async (unitId) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        await remove(ref(database, `vehicleUnits/${vehicleId}/${unitId}`));
      } catch (error) {
        console.error("Error deleting unit:", error);
        alert('Failed to delete unit. Please try again.');
      }
    }
  };

  // Update unit status
  const handleStatusChange = async (unitId, newStatus) => {
    try {
      await update(ref(database, `vehicleUnits/${vehicleId}/${unitId}`), {
        status: newStatus,
        ...(newStatus === 'sold' ? { soldOn: new Date().toISOString() } : {})
      });
    } catch (error) {
      console.error("Error updating status:", error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Search functionality
  const filteredUnits = unitDetails.filter(unit => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    if (searchField === 'all') {
      return (
        unit.motorNumber.toLowerCase().includes(query) ||
        unit.chassisNumber.toLowerCase().includes(query) ||
        unit.batteryNumber.toLowerCase().includes(query) ||
        unit.controllerNumber.toLowerCase().includes(query)
      );
    }
    
    return unit[searchField] && unit[searchField].toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          Vehicle not found. Please return to inventory.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <button 
                onClick={() => navigate('/vehicles')}
                className="text-gray-600 hover:text-gray-800"
              >
                &larr; Back to Inventory
              </button>
              <h1 className="text-2xl font-bold text-green-700 mt-2">
                {vehicle.name} - {vehicle.model}
              </h1>
              <p className="text-gray-600">
                {vehicle.category} • {vehicle.fuelType || 'N/A'} • {vehicle.engineCapacity || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-green-800">₹{vehicle.price.toLocaleString()}</p>
              <p className={`mt-1 ${unitDetails.length < vehicle.quantity ? 'text-green-600' : 'text-red-600'}`}>
                {unitDetails.length} of {vehicle.quantity} units documented
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Unit Details</h2>
          {unitDetails.length < vehicle.quantity && (
            <button
              onClick={() => setIsAddingUnit(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add New Unit
            </button>
          )}
        </div>

        {/* Add Unit Form */}
        {isAddingUnit && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Unit</h3>
              <button
                onClick={() => setIsAddingUnit(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddUnit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Motor Number*</label>
                  <input
                    type="text"
                    name="motorNumber"
                    value={newUnit.motorNumber}
                    onChange={handleUnitInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Chassis Number*</label>
                  <input
                    type="text"
                    name="chassisNumber"
                    value={newUnit.chassisNumber}
                    onChange={handleUnitInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Battery Number*</label>
                  <input
                    type="text"
                    name="batteryNumber"
                    value={newUnit.batteryNumber}
                    onChange={handleUnitInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Controller Number*</label>
                  <input
                    type="text"
                    name="controllerNumber"
                    value={newUnit.controllerNumber}
                    onChange={handleUnitInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={newUnit.status}
                    onChange={handleUnitInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="in-stock">In Stock</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddingUnit(false)}
                  className="px-4 py-2 mr-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="w-full md:w-48 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Fields</option>
                <option value="motorNumber">Motor Number</option>
                <option value="chassisNumber">Chassis Number</option>
                <option value="batteryNumber">Battery Number</option>
                <option value="controllerNumber">Controller Number</option>
              </select>
            </div>
          </div>
        </div>

        {/* Units Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredUnits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motor Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chassis Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Battery Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Controller Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Added
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {unit.motorNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {unit.chassisNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {unit.batteryNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {unit.controllerNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${unit.status === 'in-stock' ? 'bg-green-100 text-green-800' : 
                            unit.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-blue-100 text-blue-800'}`}>
                          {unit.status === 'in-stock' ? 'In Stock' : 
                            unit.status === 'reserved' ? 'Reserved' : 'Sold'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(unit.addedOn).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {unit.status !== 'sold' && (
                          <div className="flex justify-end space-x-2">
                            <select
                              value={unit.status}
                              onChange={(e) => handleStatusChange(unit.id, e.target.value)}
                              className="text-xs p-1 border border-gray-300 rounded"
                            >
                              <option value="in-stock">In Stock</option>
                              <option value="reserved">Reserved</option>
                              <option value="sold">Sold</option>
                            </select>
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        {unit.status === 'sold' && (
                          <span className="text-gray-500">Sold</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchQuery ? (
                <p className="text-gray-500">No units found matching your search criteria.</p>
              ) : (
                <div>
                  <p className="text-gray-500 mb-4">No units have been added yet.</p>
                  {unitDetails.length < vehicle.quantity && (
                    <button
                      onClick={() => setIsAddingUnit(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Add First Unit
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Inventory Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500">Total Units</p>
              <p className="text-2xl font-bold">{vehicle.quantity}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500">Documented</p>
              <p className="text-2xl font-bold">{unitDetails.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500">Status Breakdown</p>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-green-600 font-bold">
                    {unitDetails.filter(u => u.status === 'in-stock').length}
                  </p>
                  <p className="text-xs text-gray-500">In Stock</p>
                </div>
                <div>
                  <p className="text-yellow-600 font-bold">
                    {unitDetails.filter(u => u.status === 'reserved').length}
                  </p>
                  <p className="text-xs text-gray-500">Reserved</p>
                </div>
                <div>
                  <p className="text-blue-600 font-bold">
                    {unitDetails.filter(u => u.status === 'sold').length}
                  </p>
                  <p className="text-xs text-gray-500">Sold</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleBilling;