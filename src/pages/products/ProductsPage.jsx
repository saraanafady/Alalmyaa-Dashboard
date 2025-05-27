import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Badge from "../../components/Badge";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import ProductForm from "./ProductForm";
import toast from "react-hot-toast";

// Mock data
const initialProducts = [
  {
    id: 1,
    name: "Product 1",
    category: "Electronics",
    price: 99.99,
    stock: 50,
    status: "In Stock",
    sku: "ELEC-001",
    description: "A great product",
  },
  {
    id: 2,
    name: "Product 2",
    category: "Clothing",
    price: 49.99,
    stock: 100,
    status: "In Stock",
    sku: "CLOTH-001",
    description: "A comfortable product",
  },
  // Add more mock products as needed
];

const ProductsPage = () => {
  const [products, setProducts] = useState(initialProducts);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setProducts(products.filter((product) => product.id !== id));
      toast.success("Product deleted successfully");
    }
  };

  const handleSubmit = (data) => {
    if (selectedProduct) {
      // Update existing product
      setProducts(
        products.map((product) =>
          product.id === selectedProduct.id ? { ...product, ...data } : product
        )
      );
      toast.success("Product updated successfully");
    } else {
      // Add new product
      const newProduct = {
        id: Math.max(...products.map((p) => p.id)) + 1,
        ...data,
      };
      setProducts([...products, newProduct]);
      toast.success("Product added successfully");
    }
    setIsModalOpen(false);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const columns = [
    { key: "id", title: "ID" },
    { key: "name", title: "Product Name" },
    { key: "category", title: "Category" },
    { key: "price", title: "Price" },
    {
      key: "stock",
      title: "Stock",
      render: (row) => (
        <Badge variant={row.stock > 0 ? "success" : "error"}>{row.stock}</Badge>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <Badge
          variant={
            row.status === "active"
              ? "success"
              : row.status === "out-of-stock"
              ? "error"
              : "warning"
          }
        >
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <Button onClick={handleAddProduct}>Add Product</Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select className="px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>
      </div>

      <Card>
        <Table
          columns={columns}
          data={filteredProducts}
          onRowClick={handleEditProduct}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? "Edit Product" : "Add Product"}
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            placeholder="Enter product name"
            defaultValue={selectedProduct?.name}
          />

          <Select
            label="Category"
            options={[
              { value: "electronics", label: "Electronics" },
              { value: "clothing", label: "Clothing" },
              { value: "books", label: "Books" },
            ]}
            defaultValue={selectedProduct?.category}
          />

          <Input
            label="Price"
            type="number"
            placeholder="Enter price"
            defaultValue={selectedProduct?.price}
          />

          <Input
            label="Stock"
            type="number"
            placeholder="Enter stock quantity"
            defaultValue={selectedProduct?.stock}
          />

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button>{selectedProduct ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
