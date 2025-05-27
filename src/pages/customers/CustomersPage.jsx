import React, { useState } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import { FiEye, FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Mock data
const initialCustomers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 234 567 890',
    totalOrders: 5,
    totalSpent: 499.99,
    lastOrder: '2024-03-15',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1 234 567 891',
    totalOrders: 3,
    totalSpent: 299.99,
    lastOrder: '2024-03-14',
    status: 'Active',
  },
];

const CustomersPage = () => {
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter ? customer.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setCustomers(customers.filter((customer) => customer.id !== id));
      toast.success('Customer deleted successfully');
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setCustomers(customers.map((customer) =>
      customer.id === id ? { ...customer, status: newStatus } : customer
    ));
    toast.success('Customer status updated successfully');
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'phone', title: 'Phone' },
    { key: 'totalOrders', title: 'Orders' },
    { key: 'totalSpent', title: 'Total Spent' },
    { 
      key: 'status', 
      title: 'Status',
      render: (row) => (
        <Badge 
          variant={row.status === 'Active' ? 'success' : 'default'}
        >
          {row.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <Button onClick={handleAddCustomer}>Add Customer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <p className="text-3xl font-bold text-blue-600">89</p>
          <p className="text-sm text-gray-500">Total Customers</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-green-600">75</p>
          <p className="text-sm text-gray-500">Active Customers</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-purple-600">$45,678</p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </Card>
      </div>

      <Card>
        <Table 
          columns={columns} 
          data={filteredCustomers}
          onRowClick={handleEditCustomer}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter customer name"
            defaultValue={selectedCustomer?.name}
          />
          
          <Input
            label="Email"
            type="email"
            placeholder="Enter email address"
            defaultValue={selectedCustomer?.email}
          />
          
          <Input
            label="Phone"
            placeholder="Enter phone number"
            defaultValue={selectedCustomer?.phone}
          />
          
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button>
              {selectedCustomer ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage; 