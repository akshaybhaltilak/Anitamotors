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
  const [searchFilter, setSearchFilter] = useState('chassisNo'); // Default to chassis number
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
      // Only set filtered vehicles if not showing sold vehicles
      if (!showSoldVehicles) {
        setFilteredVehicles(vehiclesList);
      }
    });

    onValue(soldVehiclesRef, (snapshot) => {
      const data = snapshot.val();
      const soldList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key],
        status: 'sold'
      })) : [];
      setSoldVehicles(soldList);
      // If showing sold vehicles, update filtered list
      if (showSoldVehicles) {
        setFilteredVehicles(soldList);
      }
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
  }, [showSoldVehicles]);

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
      // Determine which database to delete from based on status
      const vehicleToDelete = [...vehicles, ...soldVehicles].find(v => v.id === id);
      
      if (vehicleToDelete) {
        const path = vehicleToDelete.status === 'sold' ? 'soldVehicles' : 'vehicles';
        remove(ref(database, `${path}/${id}`));
  
        // Delete all associated units
        vehicleUnits.forEach(unit => {
          if (unit.vehicleId === id) {
            remove(ref(database, `vehicleUnits/${unit.id}`));
          }
        });
      }
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
      // More efficient chassis number search
      const matchingUnits = vehicleUnits.filter(unit =>
        unit.chassisNo && unit.chassisNo.toLowerCase().includes(query)
      );

      if (matchingUnits.length > 0) {
        const matchingVehicles = matchingUnits.map(unit => {
          // Find the vehicle in either available or sold list
          const vehicle = [...vehicles, ...soldVehicles].find(v => v.id === unit.vehicleId);
          return vehicle ? { ...vehicle, unitDetails: unit } : null;
        }).filter(Boolean);

        // Filter matching vehicles based on current view (sold or available)
        const filteredMatches = matchingVehicles.filter(v => 
          (showSoldVehicles && v.status === 'sold') || 
          (!showSoldVehicles && v.status === 'available')
        );

        setFilteredVehicles(filteredMatches);
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

  // Toggle between available and sold vehicles
  const toggleSoldVehiclesView = () => {
    const newShowSoldValue = !showSoldVehicles;
    setShowSoldVehicles(newShowSoldValue);
    setFilteredVehicles(newShowSoldValue ? soldVehicles : vehicles);
    setSearchQuery(''); // Reset search when toggling view
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
    // Find vehicle from either available or sold list
    const vehicle = [...vehicles, ...soldVehicles].find(v => v.id === unit.vehicleId);

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
      // Selling a specific unit
      set(ref(database, `sales/${newSaleKey}`), saleData);
      
      // Update the unit status to sold
      update(ref(database, `vehicleUnits/${finalBillData.unitId}`), {
        status: 'sold',
        saleId: newSaleKey
      });

      // Count all units and sold units for this vehicle
      const vehicleUnitsCount = vehicleUnits.filter(u => u.vehicleId === selectedVehicle.id).length;
      const soldUnitsCount = vehicleUnits.filter(u => 
        u.vehicleId === selectedVehicle.id && u.status === 'sold'
      ).length + 1; // +1 for the unit being sold now

      // If all units are sold, move vehicle to soldVehicles collection
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
        // Otherwise just update the quantity
        update(ref(database, `vehicles/${selectedVehicle.id}`), {
          quantity: selectedVehicle.quantity - 1
        });
      }
    } else {
      // Selling multiple units (bulk sale)
      set(ref(database, `sales/${newSaleKey}`), saleData);
      const newQuantity = selectedVehicle.quantity - finalBillData.quantity;

      if (newQuantity <= 0) {
        // If no more units left, move vehicle to soldVehicles
        const soldVehicleData = {
          ...selectedVehicle,
          status: 'sold',
          dateSold: new Date().toISOString(),
          saleId: newSaleKey
        };
        set(ref(database, `soldVehicles/${selectedVehicle.id}`), soldVehicleData);
        remove(ref(database, `vehicles/${selectedVehicle.id}`));
      } else {
        // Otherwise just update the quantity
        update(ref(database, `vehicles/${finalBillData.vehicleId}`), {
          quantity: newQuantity
        });
      }

      // Mark the appropriate number of units as sold
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
      <div className={`${vehicle.status === 'sold' ? 'bg-gradient-to-r from-gray-600 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} p-5 text-white`}>
        <h3 className="text-xl font-bold mb-1 flex items-center">
          {vehicle.name}
        </h3>
        <p className="text-sm text-blue-100">Model: {vehicle.model || 'N/A'}</p>
        {vehicle.status === 'sold' && (
          <span className="inline-block mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">SOLD</span>
        )}
      </div>

      <div className="p-5 flex-grow">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-lg text-indigo-800">₹{vehicle.price.toLocaleString()}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
            vehicle.status === 'sold' ? "bg-gray-100 text-gray-800" :
            vehicle.quantity > 10 ? "bg-green-100 text-green-800" :
            vehicle.quantity > 0 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {vehicle.status === 'sold' ? (
              <>Sold Out</>
            ) : vehicle.quantity > 0 ? (
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
        
        {vehicle.dateSold && (
          <div className="text-sm mb-4 bg-gray-50 p-3 rounded-lg">
            <span className="text-gray-600 font-medium block mb-1">Sold Date</span>
            <p className="text-gray-700">{new Date(vehicle.dateSold).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between p-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => handleEdit(vehicle)}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium"
          disabled={vehicle.status === 'sold'}
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

        {vehicle.status !== 'sold' && vehicle.quantity > 0 && (
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
        <div className={`${vehicle.status === 'sold' ? 'bg-gradient-to-r from-gray-600 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} p-5 text-white`}>
          <h3 className="text-xl font-bold mb-1 flex items-center">
            {vehicle.name}
          </h3>
          <p className="text-sm text-blue-100">Model: {vehicle.model || 'N/A'}</p>
          {hasUnitDetails && (
            <p className="text-sm bg-blue-800 px-2 py-1 rounded mt-2 inline-block">Chassis: {vehicle.unitDetails.chassisNo}</p>
          )}
          {vehicle.status === 'sold' && !hasUnitDetails && (
            <span className="inline-block mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">SOLD</span>
          )}
        </div>

        <div className="p-5 flex-grow">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-lg text-indigo-800">₹{vehicle.price.toLocaleString()}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              hasUnitDetails ? (
                vehicle.unitDetails.status === 'available' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              ) : (
                vehicle.status === 'sold' ? "bg-gray-100 text-gray-800" :
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
                  {vehicle.status === 'sold' ? (
                    <>Sold Out</>
                  ) : vehicle.quantity > 0 ? (
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
              
              {vehicle.dateSold && (
                <div className="text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600 font-medium block mb-1">Sold Date</span>
                  <p className="text-gray-700">{new Date(vehicle.dateSold).toLocaleDateString()}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between p-4 border-t border-gray-100 bg-gray-50">
          {vehicle.status !== 'sold' && (
            <button
              onClick={() => handleEdit(vehicle)}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
          )}

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

          {((vehicle.status !== 'sold' && vehicle.quantity > 0) || 
            (hasUnitDetails && vehicle.unitDetails.status === 'available')) && (
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
          <h2 className="text-xl font-bold mb-4">Enter Vehicle Unit Details</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left">#</th>
                  <th className="border px-4 py-2 text-left">Motor No</th>
                  <th className="border px-4 py-2 text-left">Chassis No</th>
                  <th className="border px-4 py-2 text-left">Battery No</th>
                  <th className="border px-4 py-2 text-left">Controller No</th>
                  <th className="border px-4 py-2 text-left">Color</th>
                </tr>
              </thead>
              <tbody>
                {vehicleUnits.map((unit, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="border px-4 py-2">{index + 1}</td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="w-full p-1 border rounded"
                        value={unit.motorNo || ''}
                        onChange={(e) => handleUnitInputChange(index, 'motorNo', e.target.value)}
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="w-full p-1 border rounded"
                        value={unit.chassisNo || ''}
                        onChange={(e) => handleUnitInputChange(index, 'chassisNo', e.target.value)}
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="w-full p-1 border rounded"
                        value={unit.batteryNo || ''}
                        onChange={(e) => handleUnitInputChange(index, 'batteryNo', e.target.value)}
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="w-full p-1 border rounded"
                        value={unit.controllerNo || ''}
                        onChange={(e) => handleUnitInputChange(index, 'controllerNo', e.target.value)}
                      />
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="w-full p-1 border rounded"
                        value={unit.color || ''}
                        onChange={(e) => handleUnitInputChange(index, 'color', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveVehicleUnits}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Save All Units
            </button>
          </div>
        </div>
      ) : showVehicleDetails ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <List size={20} className="mr-2" />
            Vehicle Units
          </h2>
          {selectedVehicleDetails && selectedVehicleDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left">#</th>
                    <th className="border px-4 py-2 text-left">Chassis No</th>
                    <th className="border px-4 py-2 text-left">Motor No</th>
                    <th className="border px-4 py-2 text-left">Battery No</th>
                    <th className="border px-4 py-2 text-left">Controller No</th>
                    <th className="border px-4 py-2 text-left">Color</th>
                    <th className="border px-4 py-2 text-left">Status</th>
                    <th className="border px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVehicleDetails.map((unit, index) => (
                    <tr key={unit.id || index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="border px-4 py-2">{index + 1}</td>
                      <td className="border px-4 py-2">{unit.chassisNo || 'N/A'}</td>
                      <td className="border px-4 py-2">{unit.motorNo || 'N/A'}</td>
                      <td className="border px-4 py-2">{unit.batteryNo || 'N/A'}</td>
                      <td className="border px-4 py-2">{unit.controllerNo || 'N/A'}</td>
                      <td className="border px-4 py-2">{unit.color || 'N/A'}</td>
                      <td className="border px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          unit.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {unit.status === 'available' ? 'Available' : 'Sold'}
                        </span>
                      </td>
                      <td className="border px-4 py-2">
                        {unit.status === 'available' && (
                          <button
                            onClick={() => handleSellUnit(unit)}
                            className="px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors text-sm"
                          >
                            Sell
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
              <AlertCircle size={48} className="text-yellow-500 mb-4" />
              <p className="text-gray-600 text-center">No units found for this vehicle.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Vehicle Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Vehicle Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Price (₹)</label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Engine Capacity</label>
                <input
                  type="text"
                  name="engineCapacity"
                  value={formData.engineCapacity}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-2">Specifications</label>
                <textarea
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                ></textarea>
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-grow max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search vehicles..."
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Fields</option>
                  <option value="name">Name</option>
                  <option value="model">Model</option>
                  <option value="chassisNo">Chassis No</option>
                </select>
                <button
                  onClick={toggleSoldVehiclesView}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    showSoldVehicles 
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Archive size={18} className="mr-2" />
                  {showSoldVehicles ? 'Show Available' : 'Show Sold'}
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map(vehicle => 
                searchQuery ? renderSearchResultCard(vehicle) : renderVehicleCard(vehicle)
              )
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow">
                <AlertCircle size={64} className="text-yellow-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No vehicles found</h3>
                <p className="text-gray-600 text-center">
                  {searchQuery 
                    ? "No results match your search criteria. Try different keywords or filters."
                    : showSoldVehicles 
                      ? "No sold vehicles in the inventory yet."
                      : "Add your first vehicle to get started."
                  }
                </p>
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