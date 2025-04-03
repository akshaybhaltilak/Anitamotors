import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../Database/firebaseconfig';
import { 
  Package, Users, Truck, Smile, ShoppingCart, 
  AlertTriangle, DollarSign, PlusCircle, IndianRupee,
  ChevronRight, Activity, AlertCircle, CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalParts: 0,
    totalValue: 0,
    lowStockItems: 0,
    totalWorkers: 0,
    totalVehicles: 0,
    recentTransactions: 0,
    pendingLeaves: 0,
    maintenanceDue: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [quickAlerts, setQuickAlerts] = useState([]);

  useEffect(() => {
    setLoading(true);
    const alerts = [];

    // Fetch parts data
    const partsRef = ref(database, 'spareParts');
    const unsubscribeParts = onValue(partsRef, (snapshot) => {
      if (snapshot.exists()) {
        const partsData = snapshot.val();
        const partsArray = Object.values(partsData);
        
        const totalParts = partsArray.length;
        const totalValue = partsArray.reduce((sum, part) => 
          sum + (part.price * part.quantity), 0);
        const lowStockItems = partsArray.filter(part => part.quantity <= 5).length;
        
        if (lowStockItems > 0) {
          alerts.push({
            type: 'warning',
            message: `${lowStockItems} spare parts are running low on stock!`,
            icon: AlertCircle,
            action: () => navigate('/spare-parts')
          });
        }

        setStats(prev => ({
          ...prev,
          totalParts,
          totalValue,
          lowStockItems
        }));
      }
    });
    
    // Fetch workers data
    const workersRef = ref(database, 'workers');
    const unsubscribeWorkers = onValue(workersRef, (snapshot) => {
      if (snapshot.exists()) {
        const workersData = snapshot.val();
        const totalWorkers = Object.keys(workersData).length;
        const pendingLeaves = Object.values(workersData).filter(worker => 
          worker.leaveStatus === 'Pending').length;
        
        if (pendingLeaves > 0) {
          alerts.push({
            type: 'info',
            message: `${pendingLeaves} worker leave requests pending`,
            icon: CalendarCheck,
            action: () => navigate('/workers?tab=leaves')
          });
        }

        setStats(prev => ({
          ...prev,
          totalWorkers,
          pendingLeaves
        }));
      }
    });

    // Fetch vehicles data
    const vehiclesRef = ref(database, 'vehicles');
    const unsubscribeVehicles = onValue(vehiclesRef, (snapshot) => {
      if (snapshot.exists()) {
        const vehiclesData = snapshot.val();
        const totalVehicles = Object.keys(vehiclesData).length;
        const maintenanceDue = Object.values(vehiclesData).filter(vehicle => 
          vehicle.maintenanceStatus === 'Due').length;
        
        if (maintenanceDue > 0) {
          alerts.push({
            type: 'warning',
            message: `${maintenanceDue} vehicles require maintenance`,
            icon: Activity,
            action: () => navigate('/maintenance')
          });
        }

        setStats(prev => ({
          ...prev,
          totalVehicles,
          maintenanceDue
        }));
      }
    });
    
    // Fetch transactions data
    const transactionsRef = ref(database, 'transactions');
    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const transactionsData = snapshot.val();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const recentTransactions = Object.values(transactionsData).filter(transaction => {
          const transactionDate = new Date(transaction.timestamp);
          return transactionDate >= today;
        }).length;
        
        setStats(prev => ({
          ...prev,
          recentTransactions
        }));
      }
      
      setQuickAlerts(alerts);
      setLoading(false);
    });
    
    return () => {
      unsubscribeParts();
      unsubscribeWorkers();
      unsubscribeVehicles();
      unsubscribeTransactions();
    };
  }, [navigate]);

  // Dashboard action buttons
  const dashboardActions = [
    { 
      title: 'Manage Workers',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      onClick: () => navigate('/workers')
    },
    { 
      title: 'Vehicle Fleet',
      icon: Truck,
      color: 'from-green-500 to-green-600',
      onClick: () => navigate('/vehicles')
    },
    { 
      title: 'Spare Parts',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/spare-parts')
    },
    { 
      title: 'Maintenance',
      icon: Smile,
      color: 'from-amber-500 to-amber-600',
      onClick: () => navigate('/maintenance')
    },
    { 
      title: 'Services',
      icon: ShoppingCart,
      color: 'from-red-500 to-red-600',
      onClick: () => navigate('/services')
    }
  ];

  // Stat cards
  const statCards = [
    { 
      title: 'Total Parts',
      value: stats.totalParts,
      icon: Package,
      trend: stats.totalParts > 0 ? 'up' : 'none',
      color: 'bg-blue-100 text-blue-600'
    },
    { 
      title: 'Inventory Value',
      value: `₹${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
      trend: stats.totalValue > 0 ? 'up' : 'none',
      color: 'bg-green-100 text-green-600'
    },
    { 
      title: 'Vehicle Fleet',
      value: stats.totalVehicles,
      icon: Truck,
      trend: stats.totalVehicles > 0 ? 'up' : 'none',
      color: 'bg-purple-100 text-purple-600'
    },
    { 
      title: 'Workforce',
      value: stats.totalWorkers,
      icon: Users,
      trend: stats.totalWorkers > 0 ? 'up' : 'none',
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-medium text-gray-700">Loading Dashboard...</h2>
          <p className="text-gray-500">Fetching the latest data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
      </div>

      {/* Quick Alerts Section */}
      {quickAlerts.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 gap-3">
            {quickAlerts.map((alert, index) => (
              <div 
                key={index} 
                onClick={alert.action}
                className={`
                  p-4 rounded-lg cursor-pointer transition-all hover:shadow-md
                  ${alert.type === 'warning' 
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' 
                    : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'}
                  flex items-center justify-between
                `}
              >
                <div className="flex items-center">
                  <alert.icon className="mr-3 flex-shrink-0" size={20} />
                  <span className="font-medium">{alert.message}</span>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, index) => (
          <div 
            key={index} 
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div className={`rounded-lg p-3 ${card.color} bg-opacity-20`}>
                <card.icon size={20} className="opacity-90" />
              </div>
              {card.trend === 'up' && (
                <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  +{card.trend === 'up' ? 'Active' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-4 mb-1">{card.title}</p>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Action Buttons */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {dashboardActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`
                bg-gradient-to-r ${action.color} text-white 
                p-4 rounded-xl 
                flex flex-col items-center justify-center
                hover:shadow-md transition-all
                hover:scale-[1.02]
              `}
            >
              <action.icon size={24} className="mb-2" />
              <span className="text-sm font-medium">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Priority Alerts</h2>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              Requires Attention
            </span>
          </div>
          
          {stats.lowStockItems === 0 && stats.maintenanceDue === 0 && stats.pendingLeaves === 0 ? (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-700 flex items-center">
                <Smile className="mr-2" size={18} />
                All systems operational. No critical alerts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.lowStockItems > 0 && (
                <div 
                  onClick={() => navigate('/spare-parts')}
                  className="bg-red-50 border border-red-200 p-3 rounded-lg cursor-pointer hover:bg-red-100 transition"
                >
                  <p className="text-red-700 flex items-center">
                    <AlertTriangle className="mr-2" size={18} />
                    {stats.lowStockItems} spare parts need restocking
                  </p>
                </div>
              )}
              
              {stats.maintenanceDue > 0 && (
                <div 
                  onClick={() => navigate('/maintenance')}
                  className="bg-amber-50 border border-amber-200 p-3 rounded-lg cursor-pointer hover:bg-amber-100 transition"
                >
                  <p className="text-amber-700 flex items-center">
                    <Activity className="mr-2" size={18} />
                    {stats.maintenanceDue} vehicles due for maintenance
                  </p>
                </div>
              )}
              
              {stats.pendingLeaves > 0 && (
                <div 
                  onClick={() => navigate('/workers?tab=leaves')}
                  className="bg-blue-50 border border-blue-200 p-3 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                >
                  <p className="text-blue-700 flex items-center">
                    <CalendarCheck className="mr-2" size={18} />
                    {stats.pendingLeaves} leave requests pending approval
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Quick Tips Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Tips</h2>
          <ul className="space-y-3">
            <li 
              className="flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
              onClick={() => navigate('/maintenance')}
            >
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <Activity className="text-blue-600" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Schedule vehicle maintenance</p>
                <p className="text-sm text-gray-500">Regular checks improve vehicle longevity</p>
              </div>
            </li>
            
            <li 
              className="flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
              onClick={() => navigate('/spare-parts')}
            >
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <Package className="text-purple-600" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Monitor spare parts</p>
                <p className="text-sm text-gray-500">Critical parts should never go out of stock</p>
              </div>
            </li>
            
            <li 
              className="flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
              onClick={() => navigate('/workers')}
            >
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Users className="text-green-600" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Update worker records</p>
                <p className="text-sm text-gray-500">Keep personnel information current</p>
              </div>
            </li>
            
            <li 
              className="flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
              onClick={() => navigate('/transactions')}
            >
              <div className="bg-amber-100 p-2 rounded-lg mr-3">
                <ShoppingCart className="text-amber-600" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Log transactions daily</p>
                <p className="text-sm text-gray-500">Accurate records help with accounting</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}