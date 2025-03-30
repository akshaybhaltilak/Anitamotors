import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../Database/firebaseconfig';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { Phone, Edit, Trash2, Eye, Filter, Calendar, Search, ChevronDown, User, UserPlus, Wallet } from 'lucide-react';

const WorkersPage = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    role: 'worker',
    category: 'workshop',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    note: ''
  });

  const roles = ['worker', 'mechanic', 'salesperson', 'manager', 'electrician', 'helper'];
  const categories = ['workshop', 'shop', 'outsider', 'office', 'delivery'];

  // Fetch workers data from Firebase
  useEffect(() => {
    const workersRef = ref(database, 'workers');
    const unsubscribe = onValue(workersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const workersArray = Object.entries(data).map(([id, details]) => ({
          id,
          ...details
        }));
        setWorkers(workersArray);
      } else {
        setWorkers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Add new worker
  const handleAddWorker = (e) => {
    e.preventDefault();
    const workersRef = ref(database, 'workers');
    const newWorkerRef = push(workersRef);

    // Calculate current month attendance record structure
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const initialAttendance = {};
    for (let i = 1; i <= daysInMonth; i++) {
      initialAttendance[i] = 'none'; // 'present', 'absent', 'none'
    }

    const workerData = {
      ...formData,
      attendance: {
        [`${currentYear}-${currentMonth + 1}`]: initialAttendance
      },
      advances: [],
      createdAt: new Date().toISOString()
    };

    set(newWorkerRef, workerData)
      .then(() => {
        setFormData({
          name: '',
          age: '',
          phone: '',
          role: 'worker',
          category: 'workshop',
          salary: '',
          joinDate: new Date().toISOString().split('T')[0],
          note: ''
        });
        setShowAddForm(false);
      })
      .catch(error => {
        console.error("Error adding worker: ", error);
      });
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Navigate to worker details
  const handleViewWorker = (workerId) => {
    navigate(`/worker/${workerId}`);
  };

  // Filter workers based on category, role, and search term
  const filteredWorkers = workers.filter(worker => {
    const matchesCategory = filterCategory === 'all' || worker.category === filterCategory;
    const matchesRole = filterRole === 'all' || worker.role === filterRole;
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone.includes(searchTerm);

    return matchesCategory && matchesRole && matchesSearch;
  });

  // Calculate present days and payment for current month
  const calculateMonthlyStats = (worker) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthKey = `${currentYear}-${currentMonth}`;

    if (!worker.attendance || !worker.attendance[monthKey]) {
      return { presentDays: 0, payment: 0 };
    }

    const monthAttendance = worker.attendance[monthKey];
    const presentDays = Object.values(monthAttendance).filter(status => status === 'present').length;

    // Calculate payment based on present days
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const dailyRate = worker.salary / daysInMonth;
    const basePayment = dailyRate * presentDays;

    // Subtract advances if any
    const advances = worker.advances || [];
    const currentMonthAdvances = advances.filter(adv => {
      const advDate = new Date(adv.date);
      return advDate.getMonth() + 1 === currentMonth && advDate.getFullYear() === currentYear;
    });

    const totalAdvances = currentMonthAdvances.reduce((sum, adv) => sum + parseFloat(adv.amount), 0);
    const finalPayment = basePayment - totalAdvances;

    return {
      presentDays,
      payment: finalPayment > 0 ? finalPayment : 0,
      totalAdvances
    };
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl shadow-sm border border-white/30">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-indigo-500" size={22} />
            <span>Worker Management</span>
            <span className="ml-auto bg-indigo-600 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full">
              {/* {filteredWorkers.length} {filteredWorkers.length === 1 ? 'Member' : 'Members'} */}
            </span>
          </h2>
        </div>

      {/* Search and Filter Section */}
      <div className="mb-6 backdrop-blur-md bg-white/30 rounded-xl shadow-lg p-5 border border-white/20">
        {/* Search Bar with Floating Glass Effect */}
        <div className="flex items-center mb-5 relative">
          <div className="absolute inset-0 bg-white/50 rounded-xl shadow-sm -z-10"></div>
          <Search className="absolute left-4 text-indigo-500/90" size={20} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="pl-12 pr-5 py-3 w-full bg-white/70 rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/90 focus:border-transparent placeholder:text-gray-500/80 text-gray-700 transition-all duration-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Section with Glass Cards */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Category Filter */}
          <div className="relative flex-1 min-w-[150px]">
            <div className="absolute inset-0 bg-white/50 rounded-xl shadow-sm -z-10"></div>
            <select
              className="w-full px-4 py-3 bg-white/70 rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/90 focus:border-transparent appearance-none text-gray-700 transition-all duration-200 shadow-sm pr-8"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 text-indigo-500/80 pointer-events-none" size={18} />
          </div>

          {/* Role Filter */}
          <div className="relative flex-1 min-w-[150px]">
            <div className="absolute inset-0 bg-white/50 rounded-xl shadow-sm -z-10"></div>
            <select
              className="w-full px-4 py-3 bg-white/70 rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/90 focus:border-transparent appearance-none text-gray-700 transition-all duration-200 shadow-sm pr-8"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 text-indigo-500/80 pointer-events-none" size={18} />
          </div>
        </div>

        {/* Micro-interaction Indicator */}
        <div className="mt-4 flex justify-center">
          <div className="h-1 w-16 bg-indigo-400/60 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Add Worker Button */}
      <button
        className="mb-6 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2"
        onClick={() => setShowAddForm(!showAddForm)}
      >
        {showAddForm ? 'Cancel' : '+ Add New Worker'}
      </button>

      {/* Add Worker Form */}
      {showAddForm && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Add New Worker</h2>
          <form onSubmit={handleAddWorker}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name*</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Age"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Phone Number*</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Role*</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Category*</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Monthly Salary*</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter salary amount"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Join Date</label>
                  <input
                    type="date"
                    name="joinDate"
                    value={formData.joinDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional notes"
                  rows="3"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition duration-300"
              >
                Save Worker
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workers List */}
      <div className="space-y-5">
        {/* Header with glass effect */}
        <div className="backdrop-blur-md bg-white/70 p-4 rounded-xl shadow-sm border border-white/30">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-indigo-500" size={22} />
            <span>Workforce</span>
            <span className="ml-auto bg-indigo-100 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full">
              {filteredWorkers.length} {filteredWorkers.length === 1 ? 'Member' : 'Members'}
            </span>
          </h2>
        </div>

        {/* Empty state */}
        {filteredWorkers.length === 0 && (
          <div className="backdrop-blur-md bg-white/50 rounded-xl p-8 text-center border border-white/30 shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[200px]">
            <UserPlus className="text-gray-400" size={32} />
            <p className="text-gray-600 font-medium">No team members found</p>
            <p className="text-gray-500 text-sm max-w-[280px]">
              Add your first worker to build your team and start managing your workforce
            </p>
            <button className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-md">
              Add New Worker
            </button>
          </div>
        )}

        {/* Workers list */}
        <div className="grid gap-4">
          {filteredWorkers.map(worker => {
            const { presentDays, payment, totalAdvances } = calculateMonthlyStats(worker);
            const dueColor = payment > 0 ? 'text-green-600' : 'text-gray-500';
            const advanceColor = totalAdvances > 0 ? 'text-red-500' : 'text-gray-300';

            return (
              <div key={worker.id} className="backdrop-blur-md bg-white/70 rounded-xl shadow-sm overflow-hidden border border-white/30 transition-all hover:shadow-md hover:border-white/50">
                {/* Worker header with action buttons */}
                <div className="p-4 pb-3 flex items-start justify-between border-b border-white/20">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <User className="text-indigo-500/80" size={18} />
                      {worker.name}
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-indigo-100/80 text-indigo-800 rounded-full capitalize">
                        {worker.role}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100/80 text-gray-800 rounded-full capitalize">
                        {worker.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewWorker(worker.id)}
                      className="p-2 bg-white/90 text-indigo-500 rounded-lg hover:bg-indigo-50 border border-white shadow-sm hover:shadow-md transition-all"
                      aria-label="View worker details"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>

                {/* Worker details */}
                <div className="p-4 pt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="text-gray-400" size={14} />
                    <span className="truncate">{worker.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wallet className="text-gray-400" size={14} />
                    <span>₹{worker.salary.toLocaleString()}</span>
                  </div>
                </div>

                {/* Monthly stats with glass effect */}
                <div className="backdrop-blur-md bg-white/80 p-3 mx-3 mb-3 rounded-lg border border-white/30 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="text-gray-400" size={14} />
                      <span>This month</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {presentDays} {presentDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Balance:</span>
                      <span className={`text-sm font-bold ${dueColor}`}>
                        ₹{Math.abs(payment).toLocaleString()}
                      </span>
                    </div>
                    <div className={`text-xs font-medium ${advanceColor}`}>
                      {totalAdvances > 0 && (
                        <>
                          <span className="mr-1">Advances:</span>
                          <span>₹{totalAdvances.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkersPage;