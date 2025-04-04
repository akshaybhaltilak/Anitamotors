import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '../../Database/firebaseconfig';
import { 
  PlusCircle, Edit2, Trash2, Save, X, Search, Filter, 
  TrendingUp, AlertTriangle, Package, Truck, DollarSign, 
  PieChart, BarChart2, Download,
  Grid
} from 'lucide-react';

export default function SparePartsManagement() {
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPart, setCurrentPart] = useState({
    id: null,
    name: '',
    partNumber: '',
    quantity: 0,
    price: 0,
    category: '',
    manufacturer: '',
    location: '',
    minStockLevel: 5,
    image: ''
  });
  const [transactionData, setTransactionData] = useState({
    partId: '',
    quantity: 1,
    type: 'sale', // 'sale' or 'purchase'
    notes: ''
  });
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [categories, setCategories] = useState([]);
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Fetch parts from Firebase
  useEffect(() => {
    const partsRef = ref(database, 'spareParts');
    
    const unsubscribe = onValue(partsRef, (snapshot) => {
      setLoading(true);
      
      if (snapshot.exists()) {
        const partsData = snapshot.val();
        const partsArray = Object.keys(partsData).map(key => ({
          id: key,
          ...partsData[key]
        }));
        
        // Extract unique categories
        const uniqueCategories = [...new Set(partsArray.map(part => part.category).filter(Boolean))];
        setCategories(uniqueCategories);
        
        setParts(partsArray);
        setFilteredParts(partsArray);
      } else {
        setParts([]);
        setFilteredParts([]);
      }
      
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter parts based on search, category, and low stock
  useEffect(() => {
    let result = [...parts];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(part => 
        part.name.toLowerCase().includes(query) || 
        part.partNumber.toLowerCase().includes(query) ||
        part.manufacturer?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (filterCategory) {
      result = result.filter(part => part.category === filterCategory);
    }
    
    // Low stock filter
    if (showLowStock) {
      result = result.filter(part => part.quantity <= (part.minStockLevel || 5));
    }
    
    setFilteredParts(result);
  }, [searchQuery, filterCategory, showLowStock, parts]);

  // Handle part form input changes
  const handlePartInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentPart({
      ...currentPart,
      [name]: ['quantity', 'price', 'minStockLevel'].includes(name) ? parseFloat(value) || 0 : value
    });
  };

  // Handle transaction form input changes
  const handleTransactionInputChange = (e) => {
    const { name, value } = e.target;
    setTransactionData({
      ...transactionData,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    });
  };

  // Add new part
  const handleAddPart = () => {
    setIsEditMode(false);
    setCurrentPart({
      id: null,
      name: '',
      partNumber: '',
      quantity: 0,
      price: 0,
      category: '',
      manufacturer: '',
      location: '',
      minStockLevel: 5,
      image: ''
    });
    setIsFormOpen(true);
  };

  // Edit existing part
  const handleEditPart = (part) => {
    setIsEditMode(true);
    setCurrentPart({
      ...part,
      minStockLevel: part.minStockLevel || 5
    });
    setIsFormOpen(true);
  };

  // Save part (add or update)
  const handleSavePart = () => {
    if (!currentPart.name || !currentPart.partNumber) {
      setError('Name and Part Number are required.');
      return;
    }

    try {
      if (isEditMode && currentPart.id) {
        // Update existing part
        const partRef = ref(database, `spareParts/${currentPart.id}`);
        update(partRef, {
          name: currentPart.name,
          partNumber: currentPart.partNumber,
          quantity: currentPart.quantity,
          price: currentPart.price,
          category: currentPart.category,
          manufacturer: currentPart.manufacturer,
          location: currentPart.location,
          minStockLevel: currentPart.minStockLevel,
          image: currentPart.image,
          updatedAt: new Date().toISOString()
        });
        setSuccess('Part updated successfully!');
      } else {
        // Add new part
        const partsRef = ref(database, 'spareParts');
        push(partsRef, {
          name: currentPart.name,
          partNumber: currentPart.partNumber,
          quantity: currentPart.quantity,
          price: currentPart.price,
          category: currentPart.category,
          manufacturer: currentPart.manufacturer,
          location: currentPart.location,
          minStockLevel: currentPart.minStockLevel,
          image: currentPart.image,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setSuccess('New part added successfully!');
      }
      
      setIsFormOpen(false);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete part
  const handleDeletePart = (partId) => {
    if (window.confirm('Are you sure you want to delete this spare part?')) {
      try {
        const partRef = ref(database, `spareParts/${partId}`);
        remove(partRef);
        setSuccess('Part deleted successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Handle transactions (sales/purchases)
  const handleTransaction = () => {
    if (!transactionData.partId || transactionData.quantity <= 0) {
      setError('Please select a part and enter a valid quantity.');
      return;
    }

    const selectedPart = parts.find(part => part.id === transactionData.partId);
    if (!selectedPart) {
      setError('Selected part not found.');
      return;
    }

    // Calculate new quantity based on transaction type
    let newQuantity;
    if (transactionData.type === 'sale') {
      newQuantity = selectedPart.quantity - transactionData.quantity;
      if (newQuantity < 0) {
        setError('Not enough quantity available for this sale.');
        return;
      }
    } else {
      newQuantity = selectedPart.quantity + transactionData.quantity;
    }

    try {
      // Update part quantity
      const partRef = ref(database, `spareParts/${transactionData.partId}`);
      update(partRef, {
        quantity: newQuantity,
        updatedAt: new Date().toISOString()
      });

      // Record transaction
      const transactionsRef = ref(database, 'transactions');
      push(transactionsRef, {
        partId: transactionData.partId,
        partName: selectedPart.name,
        partNumber: selectedPart.partNumber,
        quantity: transactionData.quantity,
        type: transactionData.type,
        notes: transactionData.notes,
        previousQuantity: selectedPart.quantity,
        newQuantity: newQuantity,
        timestamp: new Date().toISOString()
      });

      // Reset form and close
      setTransactionData({
        partId: '',
        quantity: 1,
        type: 'sale',
        notes: ''
      });
      setIsTransactionFormOpen(false);
      setError(null);
      setSuccess(`Transaction recorded successfully! ${selectedPart.name} ${transactionData.type === 'sale' ? 'sold' : 'purchased'}.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Part Number', 'Quantity', 'Price', 'Category', 'Manufacturer', 'Location'];
    const csvContent = [
      headers.join(','),
      ...filteredParts.map(part => [
        `"${part.name}"`,
        `"${part.partNumber}"`,
        part.quantity,
        part.price,
        `"${part.category || ''}"`,
        `"${part.manufacturer || ''}"`,
        `"${part.location || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'spare_parts_inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form for adding/editing parts
  const renderPartForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-xl w-full max-h-screen overflow-auto">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
          <h2 className="text-xl font-bold text-indigo-700">{isEditMode ? 'Edit Spare Part' : 'Add New Spare Part'}</h2>
          <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded mb-4 flex items-center">
            <AlertTriangle size={18} className="mr-2" />
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Part Name*</label>
            <input
              type="text"
              name="name"
              value={currentPart.name}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
              required
            />
          </div>
          
          {/* <div>
            <label className="block text-sm font-medium text-gray-700">Part Number*</label>
            <input
              type="text"
              name="partNumber"
              value={currentPart.partNumber}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
              required
            />
          </div> */}
          
          {/* <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              name="category"
              list="category-options"
              value={currentPart.category}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
            />
            <datalist id="category-options">
              {categories.map((category, index) => (
                <option key={index} value={category} />
              ))}
            </datalist>
          </div> */}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              min="0"
              name="quantity"
              value={currentPart.quantity}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
            <input
              type="number"
              min="0"
              name="minStockLevel"
              value={currentPart.minStockLevel}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="price"
              value={currentPart.price}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
            <input
              type="text"
              name="manufacturer"
              value={currentPart.manufacturer}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Storage Location</label>
            <input
              type="text"
              name="location"
              value={currentPart.location}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
            />
          </div>
          
          {/* <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
            <input
              type="text"
              name="image"
              value={currentPart.image}
              onChange={handlePartInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
              placeholder="https://example.com/image.jpg"
            />
          </div>
           */}
          <div className="md:col-span-2 mt-4">
            <button
              onClick={handleSavePart}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Save size={18} />
              {isEditMode ? 'Update Part' : 'Save New Part'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Form for transactions (sales/purchases)
  const renderTransactionForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-bold text-indigo-700">Record Transaction</h2>
          <button onClick={() => setIsTransactionFormOpen(false)} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded mb-4 flex items-center">
            <AlertTriangle size={18} className="mr-2" />
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Part*</label>
            <select
              name="partId"
              value={transactionData.partId}
              onChange={handleTransactionInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
              required
            >
              <option value="">-- Select Part --</option>
              {parts.map(part => (
                <option key={part.id} value={part.id}>
                  {part.name} ({part.partNumber}) - Available: {part.quantity}
                </option>
              ))}
            </select>
          </div>
          
          {transactionData.partId && (
            <div className="bg-indigo-50 p-3 rounded-md">
              <div className="text-sm text-indigo-800">
                <strong>Selected Part:</strong> {parts.find(p => p.id === transactionData.partId)?.name}
              </div>
              <div className="text-sm text-indigo-800">
                <strong>Current Stock:</strong> {parts.find(p => p.id === transactionData.partId)?.quantity} units
              </div>
              <div className="text-sm text-indigo-800">
                <strong>Price:</strong> ₹{parts.find(p => p.id === transactionData.partId)?.price?.toFixed(2)}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Transaction Type*</label>
              <select
                name="type"
                value={transactionData.type}
                onChange={handleTransactionInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
              >
                <option value="sale">Sale (Out)</option>
                <option value="purchase">Purchase (In)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity*</label>
              <input
                type="number"
                min="1"
                name="quantity"
                value={transactionData.quantity}
                onChange={handleTransactionInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              value={transactionData.notes}
              onChange={handleTransactionInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-2 border"
              rows="3"
              placeholder="Add any relevant details about this transaction..."
            />
          </div>
          
          {transactionData.partId && transactionData.type === 'sale' && transactionData.quantity > 0 && (
            <div className="bg-blue-50 p-3 rounded-md flex items-center">
              <PieChart size={18} className="text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                {transactionData.quantity > (parts.find(p => p.id === transactionData.partId)?.quantity || 0) 
                  ? <span className="text-red-600 font-medium">Insufficient stock! Only {parts.find(p => p.id === transactionData.partId)?.quantity} available.</span> 
                  : <span>After this transaction, {parts.find(p => p.id === transactionData.partId)?.quantity - transactionData.quantity} units will remain in stock.</span>
                }
              </span>
            </div>
          )}
          
          <button
            onClick={handleTransaction}
            disabled={transactionData.type === 'sale' && transactionData.partId && transactionData.quantity > (parts.find(p => p.id === transactionData.partId)?.quantity || 0)}
            className="bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center justify-center gap-2 mt-2 font-medium"
          >
            <Save size={18} />
            Record Transaction
          </button>
        </div>
      </div>
    </div>
  );

  // Stats cards for the dashboard
  const renderStatsCards = () => {
    // Calculate stats
    const totalParts = parts.length;
    const totalValue = parts.reduce((sum, part) => sum + (part.quantity * part.price), 0);
    const lowStockCount = parts.filter(part => part.quantity <= (part.minStockLevel || 5)).length;
    const outOfStockCount = parts.filter(part => part.quantity === 0).length;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <Package size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-bold">{totalParts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <DollarSign size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inventory Value</p>
              <p className="text-xl font-bold">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full mr-4">
              <AlertTriangle size={24} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-xl font-bold">{lowStockCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-full mr-4">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-xl font-bold">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-4">
        {/* Header section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-white">Spare Parts Management</h1>
              <p className="text-indigo-100 mt-1">Manage your inventory, track stock levels and transactions</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setIsTransactionFormOpen(true)}
                className="bg-white text-indigo-700 py-2 px-4 rounded-md hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
              >
                <TrendingUp size={18} />
                <span className="hidden sm:inline">Record Transaction</span>
                <span className="sm:hidden">Transaction</span>
              </button>
              
              <button 
                onClick={handleAddPart}
                className="bg-indigo-800 text-white py-2 px-4 rounded-md hover:bg-indigo-900 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
              >
                <PlusCircle size={18} />
                <span className="hidden sm:inline">Add New Part</span>
                <span className="sm:hidden">Add Part</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Success message */}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm flex items-center justify-between">
            <div className="flex items-center">
              <Save className="mr-2" size={20} />
              {success}
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-700">
              <X size={18} />
            </button>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="mr-2" size={20} />
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-red-700">
              <X size={18} />
            </button>
          </div>
        )}
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex overflow-x-auto pb-2 space-x-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === 'inventory' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === 'analytics' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Analytics
            </button>
          </div>
        </div>
        
        {/* Analytics dashboard */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Inventory Analytics</h2>
            {renderStatsCards()}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white p-4 rounded-lg shadow-md border">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Category Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                  <BarChart2 size={64} className="text-gray-300" />
                  <p className="text-gray-500 ml-3">Category distribution chart will appear here</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md border">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Stock Status</h3>
                <div className="h-64 flex items-center justify-center">
                  <PieChart size={64} className="text-gray-300" />
                  <p className="text-gray-500 ml-3">Stock status chart will appear here</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={exportToCSV}
                className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Download size={18} />
                Export Analytics
              </button>
            </div>
          </div>
        )}
        
        {/* Inventory view */}
        {activeTab === 'inventory' && (
          <>
            {/* Stats cards */}
            {renderStatsCards()}
            
            {/* Search and filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search parts by name, number or manufacturer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category, index) => (
                      <option key={index} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showLowStock"
                      checked={showLowStock}
                      onChange={() => setShowLowStock(!showLowStock)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <label htmlFor="showLowStock" className="text-sm text-gray-700">Show Low Stock Only</label>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      <BarChart2 size={20} />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      <Grid size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">Loading inventory data...</p>
                  </div>
                ) : filteredParts.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-1">No parts found</h3>
                    <p className="text-gray-500">
                      {searchQuery || filterCategory || showLowStock ? 
                        'Try adjusting your search or filters' : 
                        'Add your first spare part to get started'}
                    </p>
                    {(searchQuery || filterCategory || showLowStock) && (
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setFilterCategory('');
                          setShowLowStock(false);
                        }}
                        className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Details</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredParts.map(part => (
                          <tr key={part.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {part.image ? (
                                  <img src={part.image} alt={part.name} className="h-10 w-10 rounded-md mr-3 object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-indigo-100 flex items-center justify-center mr-3">
                                    <Package size={20} className="text-indigo-600" />
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{part.name}</div>
                                  <div className="text-sm text-gray-500">{part.partNumber}</div>
                                  {part.manufacturer && (
                                    <div className="text-xs text-gray-400">{part.manufacturer}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {part.quantity <= (part.minStockLevel || 5) ? (
                                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                                    Low
                                  </span>
                                ) : (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                                    OK
                                  </span>
                                )}
                                <span className="text-sm text-gray-900">{part.quantity} pcs</span>
                              </div>
                              {part.minStockLevel && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Min: {part.minStockLevel} pcs
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">₹{part.price.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">
                                Value: ₹{(part.quantity * part.price).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {part.category ? (
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                                  {part.category}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {part.location || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button 
                                  onClick={() => handleEditPart(part)} 
                                  className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-full transition-colors"
                                  title="Edit Part"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePart(part.id)}
                                  className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full transition-colors"
                                  title="Delete Part"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                  <div className="col-span-full p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">Loading inventory data...</p>
                  </div>
                ) : filteredParts.length === 0 ? (
                  <div className="col-span-full p-8 text-center">
                    <Package size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-1">No parts found</h3>
                    <p className="text-gray-500">
                      {searchQuery || filterCategory || showLowStock ? 
                        'Try adjusting your search or filters' : 
                        'Add your first spare part to get started'}
                    </p>
                  </div>
                ) : (
                  filteredParts.map(part => (
                    <div key={part.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">{part.name}</h3>
                            <p className="text-sm text-gray-500">{part.partNumber}</p>
                          </div>
                          {part.quantity <= (part.minStockLevel || 5) ? (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              Low Stock
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              In Stock
                            </span>
                          )}
                        </div>
                        
                        <div className="flex mt-4 justify-between">
                          <div>
                            <div className="text-xs text-gray-500">Quantity</div>
                            <div className="text-md font-medium">{part.quantity} pcs</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Price</div>
                            <div className="text-md font-medium">₹{part.price.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Value</div>
                            <div className="text-md font-medium">₹{(part.quantity * part.price).toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {part.category && (
                          <div className="mt-4">
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                              {part.category}
                            </span>
                          </div>
                        )}
                        
                        {part.location && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Location:</span> {part.location}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex justify-end space-x-2">
                        <button 
                          onClick={() => handleEditPart(part)} 
                          className="text-indigo-600 hover:text-indigo-900 bg-white p-2 rounded-md transition-colors border border-indigo-200"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePart(part.id)}
                          className="text-red-600 hover:text-red-900 bg-white p-2 rounded-md transition-colors border border-red-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modals */}
      {isFormOpen && renderPartForm()}
      {isTransactionFormOpen && renderTransactionForm()}
    </div>
  );
}