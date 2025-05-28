import { useState, useEffect, Fragment } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

const CategoriesPage = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${base_url}/api/categories`);
      // Handle both response formats (with and without status wrapper)
      return Array.isArray(data) ? data : (data.data?.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error.response?.data);
      throw error;
    }
  };

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => axios.delete(`${base_url}/api/categories/${id}`),
    onSuccess: () => {
      toast.success("Category deleted successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete category");
      console.error(err);
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: ({ id }) =>
      axios.patch(`${base_url}/api/categories/${id}/toggle-status`),
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      toast.error("Failed to update status");
      console.error(err);
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: (formData) => {
      console.log('Sending category data:', formData); // Debug log
      return axios.post(`${base_url}/api/categories`, formData);
    },
    onSuccess: (response) => {
      console.log('Category created successfully:', response.data);
      toast.success("Category added successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      console.error("Error creating category:", err.response?.data);
      handleFormError(err);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      console.log('Updating category with ID:', id);
      console.log('Update data:', formData);
      if (!id) {
        throw new Error('Category ID is required for update');
      }
      return axios.put(`${base_url}/api/categories/${id}`, formData);
    },
    onSuccess: (response) => {
      console.log('Category updated successfully:', response.data);
      toast.success("Category updated successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      console.error("Error updating category:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      handleFormError(err);
    },
  });

  const handleFormError = (err) => {
    const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to submit category";
    console.error("Form error details:", {
      message: errorMessage,
      data: err.response?.data,
      status: err.response?.status,
      error: err
    });
    toast.error(errorMessage);
  };

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

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleStatusChange = (id) => {
    statusChangeMutation.mutate({ id });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      isActive: formData.get("status") === "Active",
    };

    console.log('Submitting category data:', data);

    try {
      if (selectedCategory) {
        console.log('Selected category:', selectedCategory);
        if (!selectedCategory._id) {
          throw new Error('Invalid category ID');
        }
        
        // Verify the category exists before updating
        try {
          const response = await axios.get(`${base_url}/api/categories/${selectedCategory._id}`);
          console.log('Category exists:', response.data);
          
          // If we get here, the category exists, proceed with update
          await updateCategoryMutation.mutateAsync({
            id: selectedCategory._id,
            formData: data,
          });
        } catch (error) {
          console.error('Category not found:', error.response?.data);
          throw new Error('Category not found. Please refresh the page and try again.');
        }
      } else {
        // Create new category
        await addCategoryMutation.mutateAsync(data);
      }
      setIsModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error submitting form:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        toast.error(error.response.data?.message || "Failed to submit category");
      } else {
        toast.error(error.message || "Failed to submit category");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading categories: {error?.message}</p>
      </div>
    );
  }

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
              <Fragment key={category._id}>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleCategory(category._id)}
                        className="mr-2 text-gray-400 hover:text-gray-500"
                      >
                        {expandedCategories.has(category._id) ? (
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
                      value={category.isActive ? "Active" : "Inactive"}
                      onChange={() => handleStatusChange(category._id)}
                      className={`text-sm rounded-full px-2 py-1 font-semibold ${
                        category.isActive
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
                      onClick={() => handleDelete(category._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                {expandedCategories.has(category._id) &&
                  category.subcategories?.map((subcategory) => (
                    <tr key={subcategory._id} className="bg-gray-50">
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
                          value={subcategory.isActive ? "Active" : "Inactive"}
                          onChange={() => handleStatusChange(subcategory._id)}
                          className={`text-sm rounded-full px-2 py-1 font-semibold ${
                            subcategory.isActive
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
                          onClick={() => handleDelete(subcategory._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </Fragment>
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
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                        defaultValue={selectedCategory?.isActive ? "Active" : "Inactive"}
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
                        disabled={isSubmitting}
                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          isSubmitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-primary-600 hover:bg-primary-700"
                        }`}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            {selectedCategory ? "Saving..." : "Adding..."}
                          </span>
                        ) : selectedCategory ? (
                          "Save Changes"
                        ) : (
                          "Add Category"
                        )}
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
