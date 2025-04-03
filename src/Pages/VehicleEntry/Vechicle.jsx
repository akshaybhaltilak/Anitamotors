import React, { useState, useEffect } from 'react';
import { database } from '../../Database/firebaseconfig';
import { Edit, Trash2, List, Search, AlertCircle, Archive } from "lucide-react";
import { ref, set, onValue, remove, update, push } from 'firebase/database';
import BillGenerator from '../BillGenerator/BillGenerator';

const Vehicle = () => {
  // States for vehicle data
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [soldVehicles, setSoldVehicles] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    quantity: 0,
    price: '',
    specifications: '',
    engineCapacity: '',
    id: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('name');
  const [showSoldVehicles, setShowSoldVehicles] = useState(false);

  // New state for individual vehicle units
  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [showVehicleUnits, setShowVehicleUnits] = useState(false);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);

  // States for bill management
  const [showBill, setShowBill] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [billData, setBillData] = useState({
    vehicleId: '',
    quantity: 1,
    customerName: '',
    customerContact: '',
    sellingPrice: 0,
    date: new Date().toISOString().split('T')[0],
    billNumber: `BILL-${Math.floor(Math.random() * 10000)}`
  });

  // Fetch vehicles from Firebase
  useEffect(() => {
    const vehiclesRef = ref(database, 'vehicles');
    const soldVehiclesRef = ref(database, 'soldVehicles');
    
    onValue(vehiclesRef, (snapshot) => {
      const data = snapshot.val();
      const vehiclesList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key],
        status: 'available'
      })) : [];
      setVehicles(vehiclesList);
      setFilteredVehicles(vehiclesList);
    });

    onValue(soldVehiclesRef, (snapshot) => {
      const data = snapshot.val();
      const soldList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key],
        status: 'sold'
      })) : [];
      setSoldVehicles(soldList);
    });

    // Fetch individual vehicle units
    const unitsRef = ref(database, 'vehicleUnits');
    onValue(unitsRef, (snapshot) => {
      const data = snapshot.val();
      const unitsList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setVehicleUnits(unitsList);
    });
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'price') {
      // Remove leading zeros
      const cleanedValue = value.replace(/^0+/, '') || '';
      setFormData({
        ...formData,
        [name]: cleanedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'quantity' ? parseFloat(value) || 0 : value
      });
    }
  };

  // Handle individual unit input changes
  const handleUnitInputChange = (index, field, value) => {
    const updatedUnits = [...vehicleUnits];
    if (!updatedUnits[index]) {
      updatedUnits[index] = {};
    }
    updatedUnits[index][field] = value;
    setVehicleUnits(updatedUnits);
  };

  // Handle submit for adding/editing vehicle
  const handleSubmit = (e) => {
    e.preventDefault();

    const vehicleData = {
      name: formData.name,
      category: 'Scooter',
      model: formData.model,
      quantity: formData.quantity,
      price: parseFloat(formData.price) || 0,
      specifications: formData.specifications,
      engineCapacity: formData.engineCapacity,
      colors: 'Blue, Navy Blue, Sky Blue',
      status: 'available'
    };

    if (isEditing && formData.id) {
      update(ref(database, `vehicles/${formData.id}`), vehicleData);
      setShowVehicleUnits(false);
    } else {
      const newVehicleKey = push(ref(database, 'vehicles')).key;
      set(ref(database, `vehicles/${newVehicleKey}`), {
        ...vehicleData,
        dateAdded: new Date().toISOString()
      });

      if (formData.quantity > 0) {
        const initialUnits = Array(parseInt(formData.quantity)).fill().map(() => ({
          vehicleId: newVehicleKey,
          motorNo: '',
          chassisNo: '',
          batteryNo: '',
          controllerNo: '',
          color: '',
          status: 'available'
        }));
        setVehicleUnits(initialUnits);
        setShowVehicleUnits(true);
      } else {
        resetForm();
      }
    }
  };

  // Save vehicle units to Firebase
  const saveVehicleUnits = () => {
    const isValid = vehicleUnits.every(unit =>
      unit.motorNo && unit.chassisNo && unit.batteryNo && unit.controllerNo && unit.color
    );

    if (!isValid) {
      alert('Please fill all fields for each vehicle unit.');
      return;
    }

    vehicleUnits.forEach(unit => {
      const newUnitKey = push(ref(database, 'vehicleUnits')).key;
      set(ref(database, `vehicleUnits/${newUnitKey}`), {
        ...unit,
        dateAdded: new Date().toISOString()
      });
    });

    setShowVehicleUnits(false);
    resetForm();
    alert('Vehicle units saved successfully!');
  };

  // Reset the form fields
  const resetForm = () => {
    setFormData({
      name: '',
      model: '',
      quantity: 0,
      price: '',
      specifications: '',
      engineCapacity: '',
      id: null
    });
    setIsEditing(false);
    setVehicleUnits([]);
    setShowVehicleUnits(false);
  };

  // Edit a vehicle
  const handleEdit = (vehicle) => {
    setFormData({
      ...vehicle,
      price: vehicle.price.toString(),
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete a vehicle
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      remove(ref(database, `vehicles/${id}`));

      vehicleUnits.forEach(unit => {
        if (unit.vehicleId === id) {
          remove(ref(database, `vehicleUnits/${unit.id}`));
        }
      });
    }
  };

  // Enhanced search functionality
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query.trim() === '') {
      setFilteredVehicles(showSoldVehicles ? soldVehicles : vehicles);
      setShowVehicleDetails(false);
      return;
    }

    const searchIn = showSoldVehicles ? soldVehicles : vehicles;

    if (searchFilter === 'chassisNo') {
      const matchingUnits = vehicleUnits.filter(unit =>
        unit.chassisNo && unit.chassisNo.toLowerCase().includes(query)
      );

      if (matchingUnits.length > 0) {
        const matchingVehicles = matchingUnits.map(unit => {
          const vehicle = searchIn.find(v => v.id === unit.vehicleId);
          return vehicle ? { ...vehicle, unitDetails: unit } : null;
        }).filter(Boolean);

        setFilteredVehicles(matchingVehicles);
        setShowVehicleDetails(false);
      } else {
        setFilteredVehicles([]);
        setShowVehicleDetails(false);
      }
    } else {
      const filtered = searchIn.filter(vehicle => {
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
      setShowVehicleDetails(false);
    }
  };

  // View all units of a specific vehicle
  const handleViewUnits = (vehicleId) => {
    const units = vehicleUnits.filter(unit => unit.vehicleId === vehicleId);
    setSelectedVehicleDetails(units);
    setShowVehicleDetails(true);
  };

  // Handle initiating sale of a vehicle
  const handleSellClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    setBillData({
      ...billData,
      vehicleId: vehicle.id,
      sellingPrice: vehicle.price,
      billNumber: `BILL-${Math.floor(Math.random() * 10000)}-${new Date().getTime().toString().slice(-4)}`
    });
    setShowBill(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSellUnit = (unit) => {
    const vehicle = vehicles.find(v => v.id === unit.vehicleId);

    if (vehicle) {
      setSelectedVehicle({
        ...vehicle,
        selectedUnit: unit
      });

      setBillData({
        ...billData,
        vehicleId: vehicle.id,
        sellingPrice: vehicle.price,
        unitId: unit.id,
        chassisNo: unit.chassisNo || '',
        motorNo: unit.motorNo || '',
        batteryNo: unit.batteryNo || '',
        controllerNo: unit.controllerNo || '',
        color: unit.color,
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        billNumber: `AM${Math.floor(1000 + Math.random() * 9000)}`
      });

      setShowBill(true);
      setShowVehicleDetails(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCompleteSale = (finalBillData) => {
    if (!selectedVehicle) return;

    const newSaleKey = push(ref(database, 'sales')).key;
    const saleData = {
      ...finalBillData,
      vehicleName: selectedVehicle.name,
      vehicleModel: selectedVehicle.model,
      timestamp: new Date().toISOString()
    };

    if (finalBillData.unitId) {
      set(ref(database, `sales/${newSaleKey}`), saleData);
      
      update(ref(database, `vehicleUnits/${finalBillData.unitId}`), {
        status: 'sold',
        saleId: newSaleKey
      });

      const vehicleUnitsCount = vehicleUnits.filter(u => u.vehicleId === selectedVehicle.id).length;
      const soldUnitsCount = vehicleUnits.filter(u => 
        u.vehicleId === selectedVehicle.id && u.status === 'sold'
      ).length + 1;

      if (soldUnitsCount >= vehicleUnitsCount) {
        const soldVehicleData = {
          ...selectedVehicle,
          status: 'sold',
          dateSold: new Date().toISOString(),
          saleId: newSaleKey
        };
        set(ref(database, `soldVehicles/${selectedVehicle.id}`), soldVehicleData);
        remove(ref(database, `vehicles/${selectedVehicle.id}`));
      } else {
        update(ref(database, `vehicles/${selectedVehicle.id}`), {
          quantity: selectedVehicle.quantity - 1
        });
      }
    } else {
      set(ref(database, `sales/${newSaleKey}`), saleData);
      const newQuantity = selectedVehicle.quantity - finalBillData.quantity;

      if (newQuantity <= 0) {
        const soldVehicleData = {
          ...selectedVehicle,
          status: 'sold',
          dateSold: new Date().toISOString(),
          saleId: newSaleKey
        };
        set(ref(database, `soldVehicles/${selectedVehicle.id}`), soldVehicleData);
        remove(ref(database, `vehicles/${selectedVehicle.id}`));
      } else {
        update(ref(database, `vehicles/${finalBillData.vehicleId}`), {
          quantity: newQuantity
        });
      }

      const availableUnits = vehicleUnits.filter(
        unit => unit.vehicleId === finalBillData.vehicleId && unit.status === 'available'
      );

      for (let i = 0; i < finalBillData.quantity && i < availableUnits.length; i++) {
        update(ref(database, `vehicleUnits/${availableUnits[i].id}`), {
          status: 'sold',
          saleId: newSaleKey
        });
      }
    }

    setShowBill(false);
    setSelectedVehicle(null);
    alert('Sale recorded successfully!');
  };

  // Render vehicle card
  const renderVehicleCard = (vehicle) => (
    <div key={vehicle.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
        <h3 className="text-xl font-bold mb-1 flex items-center">
          {vehicle.name}
        </h3>
        <p className="text-sm text-blue-100">Model: {vehicle.model}</p>
      </div>

      <div className="p-5 flex-grow">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-lg text-indigo-800">₹{vehicle.price.toLocaleString()}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
            vehicle.quantity > 10 ? "bg-green-100 text-green-800" :
            vehicle.quantity > 0 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {vehicle.quantity > 0 ? (
              <>{vehicle.quantity} in stock</>
            ) : (
              <>Out of stock</>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-600 block mb-1 font-medium">Colors</span>
            <div className="flex space-x-1">
              <span className="inline-block w-5 h-5 rounded-full bg-blue-500" title="Blue"></span>
              <span className="inline-block w-5 h-5 rounded-full bg-blue-800" title="Navy Blue"></span>
              <span className="inline-block w-5 h-5 rounded-full bg-blue-300" title="Sky Blue"></span>
            </div>
          </div>

          {vehicle.engineCapacity && (
            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-gray-600 block mb-1 font-medium">Engine</span>
              <p className="text-gray-800">{vehicle.engineCapacity}</p>
            </div>
          )}
        </div>

        {vehicle.specifications && (
          <div className="text-sm mb-4 bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600 font-medium block mb-1">Specifications</span>
            <p className="text-gray-700 line-clamp-2">{vehicle.specifications}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between p-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => handleEdit(vehicle)}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium"
        >
          <Edit size={16} />
          <span>Edit</span>
        </button>

        <button
          onClick={() => handleDelete(vehicle.id)}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 font-medium"
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </button>

        <button
          onClick={() => handleViewUnits(vehicle.id)}
          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 font-medium"
        >
          <List size={16} />
          <span>Units</span>
        </button>

        {vehicle.quantity > 0 && (
          <button
            onClick={() => handleSellClick(vehicle)}
            className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1 font-medium"
          >
            <span>Sell</span>
          </button>
        )}
      </div>
    </div>
  );

  // Render search result card
  const renderSearchResultCard = (vehicle) => {
    const hasUnitDetails = vehicle.unitDetails;
    
    return (
      <div key={vehicle.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
          <h3 className="text-xl font-bold mb-1 flex items-center">
            {vehicle.name}
          </h3>
          <p className="text-sm text-blue-100">Model: {vehicle.model}</p>
          {hasUnitDetails && (
            <p className="text-sm text-blue-100 mt-1">Chassis: {vehicle.unitDetails.chassisNo}</p>
          )}
        </div>

        <div className="p-5 flex-grow">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-lg text-indigo-800">₹{vehicle.price.toLocaleString()}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              hasUnitDetails ? (
                vehicle.unitDetails.status === 'available' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              ) : (
                vehicle.quantity > 10 ? "bg-green-100 text-green-800" :
                vehicle.quantity > 0 ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              )
            }`}>
              {hasUnitDetails ? (
                <span className={`${vehicle.unitDetails.status === 'available' ? 'text-green-600' : 'text-red-600'}`}>
                  {vehicle.unitDetails.status === 'available' ? 'Available' : 'Sold'}
                </span>
              ) : (
                <>
                  {vehicle.quantity > 0 ? (
                    <>{vehicle.quantity} in stock</>
                  ) : (
                    <>Out of stock</>
                  )}
                </>
              )}
            </span>
          </div>

          {hasUnitDetails && (
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="text-gray-600 block mb-1 font-medium">Motor No.</span>
                <p className="text-gray-800">{vehicle.unitDetails.motorNo}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="text-gray-600 block mb-1 font-medium">Battery No.</span>
                <p className="text-gray-800">{vehicle.unitDetails.batteryNo}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="text-gray-600 block mb-1 font-medium">Controller No.</span>
                <p className="text-gray-800">{vehicle.unitDetails.controllerNo}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="text-gray-600 block mb-1 font-medium">Color</span>
                <p className="text-gray-800">{vehicle.unitDetails.color}</p>
              </div>
            </div>
          )}

          {!hasUnitDetails && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-600 block mb-1 font-medium">Colors</span>
                  <div className="flex space-x-1">
                    <span className="inline-block w-5 h-5 rounded-full bg-blue-500" title="Blue"></span>
                    <span className="inline-block w-5 h-5 rounded-full bg-blue-800" title="Navy Blue"></span>
                    <span className="inline-block w-5 h-5 rounded-full bg-blue-300" title="Sky Blue"></span>
                  </div>
                </div>

                {vehicle.engineCapacity && (
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-gray-600 block mb-1 font-medium">Engine</span>
                    <p className="text-gray-800">{vehicle.engineCapacity}</p>
                  </div>
                )}
              </div>

              {vehicle.specifications && (
                <div className="text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600 font-medium block mb-1">Specifications</span>
                  <p className="text-gray-700 line-clamp-2">{vehicle.specifications}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => handleEdit(vehicle)}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium"
          >
            <Edit size={16} />
            <span>Edit</span>
          </button>

          <button
            onClick={() => handleDelete(vehicle.id)}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 font-medium"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>

          <button
            onClick={() => handleViewUnits(vehicle.id)}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 font-medium"
          >
            <List size={16} />
            <span>Units</span>
          </button>

          {(vehicle.quantity > 0 || (hasUnitDetails && vehicle.unitDetails.status === 'available')) && (
            <button
              onClick={() => hasUnitDetails ? handleSellUnit(vehicle.unitDetails) : handleSellClick(vehicle)}
              className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1 font-medium"
            >
              <span>Sell</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      <header className="text-black p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Scooter Inventory</h1>
          {(showBill || showVehicleUnits || showVehicleDetails) && (
            <button
              onClick={() => {
                setShowBill(false);
                setShowVehicleUnits(false);
                setShowVehicleDetails(false);
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
            >
              Back to Inventory
            </button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8">
        {showBill ? (
          <BillGenerator
            vehicle={selectedVehicle}
            initialBillData={billData}
            onCompleteSale={handleCompleteSale}
            onCancel={() => setShowBill(false)}
          />
        ) : showVehicleUnits ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-blue-700 mb-4">
              Enter Individual Vehicle Details
            </h2>
            <p className="mb-4 text-gray-600">
              Please enter details for each of the {vehicleUnits.length} vehicles in this batch.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motor No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chassis No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Battery No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Controller No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicleUnits.map((unit, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={unit.motorNo || ''}
                          onChange={(e) => handleUnitInputChange(index, 'motorNo', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter motor number"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={unit.chassisNo || ''}
                          onChange={(e) => handleUnitInputChange(index, 'chassisNo', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter chassis number"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={unit.batteryNo || ''}
                          onChange={(e) => handleUnitInputChange(index, 'batteryNo', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter battery number"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={unit.controllerNo || ''}
                          onChange={(e) => handleUnitInputChange(index, 'controllerNo', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter controller number"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={unit.color || ''}
                          onChange={(e) => handleUnitInputChange(index, 'color', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter color"
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVehicleUnits(false)}
                className="px-4 py-2 mr-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveVehicleUnits}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save All Units
              </button>
            </div>
          </div>
        ) : showVehicleDetails ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-blue-700 mb-4">
              Vehicle Details
            </h2>

            {Array.isArray(selectedVehicleDetails) ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motor No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chassis No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Battery No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Controller No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedVehicleDetails.map((unit, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unit.motorNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unit.chassisNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unit.batteryNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unit.controllerNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unit.color}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            unit.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {unit.status === 'available' ? 'Available' : 'Sold'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleSellUnit(unit)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            disabled={unit.status !== 'available'}
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 border border-blue-200">
                <h3 className="text-xl font-bold mb-4">Chassis Number: {selectedVehicleDetails.chassisNo}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Motor Number:</p>
                    <p className="font-semibold">{selectedVehicleDetails.motorNo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Battery Number:</p>
                    <p className="font-semibold">{selectedVehicleDetails.batteryNo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Controller Number:</p>
                    <p className="font-semibold">{selectedVehicleDetails.controllerNo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Color:</p>
                    <p className="font-semibold">{selectedVehicleDetails.color}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status:</p>
                    <p className={`font-semibold ${
                      selectedVehicleDetails.status === 'available' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedVehicleDetails.status === 'available' ? 'Available' : 'Sold'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold text-blue-700 mb-4">
                {isEditing ? 'Edit Scooter' : 'Add New Scooter'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Scooter Name*</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* <div>
                    <label className="block text-gray-700 mb-2">Mo*</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div> */}

                  <div>
                    <label className="block text-gray-700 mb-2">Quantity*</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Price (₹)*</label>
                    <input
                      type="text"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="Enter price"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Engine Capacity</label>
                    <input
                      type="text"
                      name="engineCapacity"
                      value={formData.engineCapacity}
                      onChange={handleInputChange}
                      placeholder="e.g. 250cc"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-gray-700 mb-2">Specifications</label>
                    <textarea
                      name="specifications"
                      value={formData.specifications}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter specifications details"
                    ></textarea>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 mr-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {isEditing ? 'Update Scooter' : 'Add Scooter'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-2xl font-bold text-blue-700 mb-4 md:mb-0">
                  Scooter Inventory
                </h2>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative">
                    <select
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="name">Search by Name</option>
                      <option value="model">Search by Model</option>
                      <option value="chassisNo">Search by Chassis No</option>
                      <option value="all">Search All Fields</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={handleSearch}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                  
                  <button
                    onClick={() => setShowSoldVehicles(!showSoldVehicles)}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                      showSoldVehicles 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <Archive size={16} />
                    {showSoldVehicles ? 'Show Available' : 'Show Sold'}
                  </button>
                </div>
              </div>

              {filteredVehicles.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="mx-auto text-gray-400" size={48} />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No vehicles found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery.trim() === '' 
                      ? 'No vehicles in inventory yet.' 
                      : 'No vehicles match your search criteria.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredVehicles.map(vehicle => {
    return searchQuery.trim() === '' 
      ? renderVehicleCard(vehicle) 
      : renderSearchResultCard(vehicle);
  })}
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