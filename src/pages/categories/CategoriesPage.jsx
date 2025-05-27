import { useState } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";

// Mock data
const initialCategories = [
  {
    id: 1,
    name: "Electronics",
    slug: "electronics",
    description: "Electronic devices and accessories",
    image: "https://example.com/electronics.jpg",
    status: "Active",
    subcategories: [
      {
        id: 101,
        name: "Smartphones",
        slug: "smartphones",
        description: "Mobile phones and accessories",
        status: "Active",
      },
      {
        id: 102,
        name: "Laptops",
        slug: "laptops",
        description: "Laptops and accessories",
        status: "Active",
      },
    ],
  },
  {
    id: 2,
    name: "Clothing",
    slug: "clothing",
    description: "Fashion and apparel",
    image: "https://example.com/clothing.jpg",
    status: "Active",
    subcategories: [
      {
        id: 201,
        name: "Men",
        slug: "men",
        description: "Men's clothing",
        status: "Active",
      },
      {
        id: 202,
        name: "Women",
        slug: "women",
        description: "Women's clothing",
        status: "Active",
      },
    ],
  },
];

const CategoriesPage = () => {
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id, isSubcategory = false) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      if (isSubcategory) {
        setCategories(
          categories.map((category) => ({
            ...category,
            subcategories: category.subcategories.filter(
              (sub) => sub.id !== id
            ),
          }))
        );
      } else {
        setCategories(categories.filter((category) => category.id !== id));
      }
      toast.success(
        `${isSubcategory ? "Subcategory" : "Category"} deleted successfully`
      );
    }
  };

  const handleStatusChange = (id, newStatus, isSubcategory = false) => {
    if (isSubcategory) {
      setCategories(
        categories.map((category) => ({
          ...category,
          subcategories: category.subcategories.map((sub) =>
            sub.id === id ? { ...sub, status: newStatus } : sub
          ),
        }))
      );
    } else {
      setCategories(
        categories.map((category) =>
          category.id === id ? { ...category, status: newStatus } : category
        )
      );
    }
    toast.success("Status updated successfully");
  };

  const handleSubmit = (data) => {
    if (selectedCategory) {
      setCategories(
        categories.map((category) =>
          category.id === selectedCategory.id
            ? { ...category, ...data }
            : category
        )
      );
      toast.success("Category updated successfully");
    } else {
      const newCategory = {
        id: Math.max(...categories.map((c) => c.id)) + 1,
        ...data,
        subcategories: [],
      };
      setCategories([...categories, newCategory]);
      toast.success("Category added successfully");
    }
    setIsModalOpen(false);
  };

  const handleSubcategorySubmit = (data) => {
    if (selectedSubcategory) {
      setCategories(
        categories.map((category) => ({
          ...category,
          subcategories: category.subcategories.map((sub) =>
            sub.id === selectedSubcategory.id ? { ...sub, ...data } : sub
          ),
        }))
      );
      toast.success("Subcategory updated successfully");
    } else {
      const newSubcategory = {
        id:
          Math.max(
            ...categories.flatMap((c) => c.subcategories).map((s) => s.id)
          ) + 1,
        ...data,
      };
      setCategories(
        categories.map((category) =>
          category.id === selectedCategory.id
            ? {
                ...category,
                subcategories: [...category.subcategories, newSubcategory],
              }
            : category
        )
      );
      toast.success("Subcategory added successfully");
    }
    setIsSubcategoryModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        <button
          onClick={() => {
            setSelectedCategory(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-white text-black border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <FiPlus className="w-5 h-5 mr-2" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Categories List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCategories.map((category) => (
              <>
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="mr-2 text-gray-400 hover:text-gray-500"
                      >
                        {expandedCategories.has(category.id) ? (
                          <FiChevronDown className="w-5 h-5" />
                        ) : (
                          <FiChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {category.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={category.status}
                      onChange={(e) =>
                        handleStatusChange(category.id, e.target.value)
                      }
                      className={`text-sm rounded-full px-2 py-1 font-semibold ${
                        category.status === "Active"
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
                        setSelectedCategory(category);
                        setIsModalOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900 mr-4"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedSubcategory(null);
                        setIsSubcategoryModalOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <FiPlus className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                {expandedCategories.has(category.id) &&
                  category.subcategories.map((subcategory) => (
                    <tr key={subcategory.id} className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap pl-12">
                        <div className="text-sm font-medium text-gray-900">
                          {subcategory.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {subcategory.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={subcategory.status}
                          onChange={(e) =>
                            handleStatusChange(
                              subcategory.id,
                              e.target.value,
                              true
                            )
                          }
                          className={`text-sm rounded-full px-2 py-1 font-semibold ${
                            subcategory.status === "Active"
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
                            setSelectedCategory(category);
                            setSelectedSubcategory(subcategory);
                            setIsSubcategoryModalOpen(true);
                          }}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <FiEdit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(subcategory.id, true)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedCategory ? "Edit Category" : "Add Category"}
                    </h2>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="bg-white px-6 py-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      handleSubmit({
                        name: formData.get("name"),
                        slug: formData.get("slug"),
                        description: formData.get("description"),
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
                        defaultValue={selectedCategory?.name}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
                        defaultValue={selectedCategory?.slug}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
                        defaultValue={selectedCategory?.description}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
                        defaultValue={selectedCategory?.status || "Active"}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {selectedCategory ? "Save Changes" : "Add Category"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsSubcategoryModalOpen(false)}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedSubcategory
                        ? "Edit Subcategory"
                        : "Add Subcategory"}
                    </h2>
                    <button
                      onClick={() => setIsSubcategoryModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="bg-white px-6 py-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      handleSubcategorySubmit({
                        name: formData.get("name"),
                        slug: formData.get("slug"),
                        description: formData.get("description"),
                        status: formData.get("status"),
                      });
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="subcategory-name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        id="subcategory-name"
                        name="name"
                        defaultValue={selectedSubcategory?.name}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subcategory-slug"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Slug
                      </label>
                      <input
                        type="text"
                        id="subcategory-slug"
                        name="slug"
                        defaultValue={selectedSubcategory?.slug}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subcategory-description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="subcategory-description"
                        name="description"
                        rows={3}
                        defaultValue={selectedSubcategory?.description}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subcategory-status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        id="subcategory-status"
                        name="status"
                        defaultValue={selectedSubcategory?.status || "Active"}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsSubcategoryModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {selectedSubcategory
                          ? "Save Changes"
                          : "Add Subcategory"}
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

export default CategoriesPage;
