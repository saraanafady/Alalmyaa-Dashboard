import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import Badge from "../../components/Badge";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import toast from "react-hot-toast";

// Mock data
const initialBrands = [
  {
    id: 1,
    name: "Apple",
    slug: "apple",
    description: "Apple Inc. is an American multinational technology company",
    logo: "https://example.com/apple-logo.png",
    website: "https://www.apple.com",
    status: "Active",
  },
  {
    id: 2,
    name: "Samsung",
    slug: "samsung",
    description:
      "Samsung Electronics is a South Korean multinational electronics corporation",
    logo: "https://example.com/samsung-logo.png",
    website: "https://www.samsung.com",
    status: "Active",
  },
];

const BrandsPage = () => {
  const [brands, setBrands] = useState(initialBrands);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBrands = brands.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this brand?")) {
      setBrands(brands.filter((brand) => brand.id !== id));
      toast.success("Brand deleted successfully");
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setBrands(
      brands.map((brand) =>
        brand.id === id ? { ...brand, status: newStatus } : brand
      )
    );
    toast.success("Status updated successfully");
  };

  const handleSubmit = (data) => {
    if (selectedBrand) {
      setBrands(
        brands.map((brand) =>
          brand.id === selectedBrand.id ? { ...brand, ...data } : brand
        )
      );
      toast.success("Brand updated successfully");
    } else {
      const newBrand = {
        id: Math.max(...brands.map((b) => b.id)) + 1,
        ...data,
      };
      setBrands([...brands, newBrand]);
      toast.success("Brand added successfully");
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Brands</h1>
        <button
          onClick={() => {
            setSelectedBrand(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-white text-black border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <FiPlus className="w-5 h-5 mr-2" />
          Add Brand
        </button>
      </div>

      {/* Search */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
      </div>

      {/* Brands List */}
      <div className="bg-white  shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white  divide-y divide-gray-200">
            {filteredBrands.map((brand) => (
              <tr key={brand.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {brand.logo && (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="h-10 w-10 rounded-full mr-3"
                      />
                    )}
                    <div className="text-sm font-medium text-gray-900">
                      {brand.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">
                    {brand.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-900"
                  >
                    {brand.website}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={brand.status}
                    onChange={(e) =>
                      handleStatusChange(brand.id, e.target.value)
                    }
                    className={`text-sm rounded-full px-2 py-1 font-semibold ${
                      brand.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedBrand(brand);
                      setIsModalOpen(true);
                    }}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    <FiEdit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(brand.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedBrand ? "Edit Brand" : "Add Brand"}
                    </h2>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <span className="sr-only">Close</span>
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white px-6 py-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      handleSubmit({
                        name: formData.get("name"),
                        slug: formData.get("slug"),
                        description: formData.get("description"),
                        logo: formData.get("logo"),
                        website: formData.get("website"),
                        status: formData.get("status"),
                      });
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        defaultValue={selectedBrand?.name}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500  sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="slug"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Slug
                      </label>
                      <input
                        type="text"
                        id="slug"
                        name="slug"
                        defaultValue={selectedBrand?.slug}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500  sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        defaultValue={selectedBrand?.description}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500  sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="logo"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Logo URL
                      </label>
                      <input
                        type="url"
                        id="logo"
                        name="logo"
                        defaultValue={selectedBrand?.logo}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500  sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="website"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Website
                      </label>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        defaultValue={selectedBrand?.website}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500  sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        defaultValue={selectedBrand?.status || "Active"}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500  sm:text-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {selectedBrand ? "Save Changes" : "Add Brand"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandsPage;
