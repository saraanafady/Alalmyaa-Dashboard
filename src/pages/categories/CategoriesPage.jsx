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
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const CategoriesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  console.log('Auth Token:', token); // Debug log for token
  console.log('Auth Headers:', { Authorization: `Bearer ${token}` }); // Debug log for headers
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for subcategories
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);

  // New state for sub-subcategories
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState(null);
  const [isSubSubcategoryModalOpen, setIsSubSubcategoryModalOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${base_url}/api/categories`, { headers });
      console.log('Raw API response:', data);
      
      // Transform and normalize the data
      const transformedData = Array.isArray(data.data) ? data.data : [];
      
      // Process categories first
      const processedCategories = await Promise.all(transformedData
        .filter(category => category && category._id)
        .map(async (category) => {
          console.log('Processing category:', category);
          
          // Process subcategories with their sub-subcategories
          const processedSubcategories = await Promise.all((category.subcategories || [])
            .filter(sub => sub && (sub._id || sub.id))
            .map(async (subcategory) => {
              console.log('Processing subcategory:', subcategory);
              
              // Fetch sub-subcategories for this specific subcategory
              try {
                const { data: subSubData } = await axios.get(
                  `${base_url}/api/sub-subcategories?subcategoryId=${subcategory._id || subcategory.id}`,
                  { headers }
                );
                console.log('Fetched sub-subcategories for subcategory:', subcategory._id, subSubData);

                const subSubcategories = (subSubData || [])
                  .filter(subSub => subSub && (subSub._id || subSub.id))
                  .map(subSubcategory => ({
                    ...subSubcategory,
                    _id: subSubcategory._id || subSubcategory.id,
                    isActive: subSubcategory.isActive ?? true,
                    categoryId: category._id || category.id,
                    subcategoryId: subcategory._id || subcategory.id
                  }));

                return {
                  ...subcategory,
                  _id: subcategory._id || subcategory.id,
                  isActive: subcategory.isActive ?? true,
                  categoryId: category._id || category.id,
                  subSubcategories
                };
              } catch (error) {
                console.error('Error fetching sub-subcategories:', error);
                return {
                  ...subcategory,
                  _id: subcategory._id || subcategory.id,
                  isActive: subcategory.isActive ?? true,
                  categoryId: category._id || category.id,
                  subSubcategories: []
                };
              }
            }));

          return {
            ...category,
            _id: category._id || category.id,
            isActive: category.isActive ?? true,
            subcategories: processedSubcategories
          };
        }));

      console.log('Final processed categories with sub-subcategories:', processedCategories);
      return processedCategories;
    } catch (error) {
      console.error("Error fetching categories:", error.response?.data);
      throw error;
    }
  };

  // Add a new function to fetch sub-subcategories for a specific subcategory
  const fetchSubSubcategoriesForSubcategory = async (subcategoryId) => {
    try {
      const { data } = await axios.get(
        `${base_url}/api/sub-subcategories?subcategoryId=${subcategoryId}`,
        { headers }
      );
      return data || [];
    } catch (error) {
      console.error("Error fetching sub-subcategories:", error);
      return [];
    }
  };

  // Update the toggleSubcategory function to fetch sub-subcategories when expanding
  const toggleSubcategory = async (subcategoryId) => {
    try {
      setExpandedSubcategories((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(subcategoryId)) {
          newSet.delete(subcategoryId);
        } else {
          newSet.add(subcategoryId);
          // Trigger a refetch of sub-subcategories when expanding
          refetchSubSubcategories();
        }
        return newSet;
      });
    } catch (error) {
      console.error("Error toggling subcategory:", error);
      toast.error("Failed to load sub-subcategories");
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

  // Update the useQuery for sub-subcategories
  const {
    data: subSubcategories = {},
    isLoadingSubSub,
    refetch: refetchSubSubcategories,
  } = useQuery({
    queryKey: ["sub-subcategories"],
    queryFn: async () => {
      const result = {};
      for (const category of categories) {
        for (const subcategory of category.subcategories || []) {
          if (!subcategory._id) continue;
          try {
            const response = await axios.get(
              `${base_url}/api/sub-subcategory?subcategoryId=${subcategory._id}`,
              { headers }
            );
            // Extract subSubcategories from the nested response
            const subSubList = response.data?.data?.subSubcategories || [];
            console.log('Fetched sub-subcategories for subcategory:', subcategory._id, subSubList);

            // Filter sub-subcategories to only include those that belong to this subcategory
            const filteredSubSubs = subSubList.filter(
              subSub => subSub.subcategory === subcategory._id && 
                       subSub.category === category._id
            );
            result[subcategory._id] = filteredSubSubs;
          } catch (error) {
            console.error(`Error fetching sub-subcategories for ${subcategory._id}:`, error);
            result[subcategory._id] = [];
          }
        }
      }
      return result;
    },
    enabled: categories.length > 0,
  });

  // Debug log for categories data structure
  useEffect(() => {
    if (categories?.length > 0) {
      console.log('First category structure:', categories[0]);
      if (categories[0]?.subcategories?.length > 0) {
        console.log('First subcategory structure:', categories[0].subcategories[0]);
        if (categories[0]?.subcategories[0]?.subSubcategories?.length > 0) {
          console.log('First sub-subcategory structure:', categories[0].subcategories[0].subSubcategories[0]);
        }
      }
    }
  }, [categories]);

  // Category Mutations
  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => {
      console.log('Deleting category with ID:', id); // Debug log
      return axios.delete(`${base_url}/api/categories/${id}`, { headers });
    },
    onSuccess: () => {
      toast.success("Category deleted successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "category");
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: ({ id }) => {
      console.log('Changing status for category:', id); // Debug log
      return axios.patch(`${base_url}/api/categories/${id}/toggle-status`, {}, { headers }); 
    },
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
       handleFormError(err, "status");
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: (formData) => {
      return axios.post(`${base_url}/api/categories`, formData, { headers });
    },
    onSuccess: (response) => {
      toast.success("Category added successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      if (!id) {
        throw new Error('Category ID is required for update');
      }
      return axios.put(`${base_url}/api/categories/${id}`, formData, { headers });
    },
    onSuccess: (response) => {
      toast.success("Category updated successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "category");
    },
  });

  // Subcategory Mutations
  const addSubcategoryMutation = useMutation({
    mutationFn: (formData) => 
      axios.post(`${base_url}/api/subcategory`, formData, { headers }),
    onSuccess: () => {
      toast.success("Subcategory added successfully");
      queryClient.invalidateQueries(["categories"]); 
    },
    onError: (err) => {
      handleFormError(err, "subcategory");
    },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      console.log('Updating subcategory:', { id, formData, headers }); // Debug log
      if (!id) {
        throw new Error('Subcategory ID is required for update');
      }
      return axios.patch(`${base_url}/api/subcategories/${id}`, formData, { 
        headers,
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        }
      });
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Subcategory updated successfully");
        queryClient.invalidateQueries(["categories"]);
      } else {
        console.error('Unexpected response:', response);
        toast.error("Failed to update subcategory");
      }
    },
    onError: (err) => {
      console.error('Update subcategory error:', {
        config: err.config,
        response: err.response?.data,
        status: err.response?.status,
        message: err.message,
        headers: err.config?.headers
      });
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "subcategory");
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id) => 
      axios.delete(`${base_url}/api/subcategory/${id}`, { headers }),
    onSuccess: () => {
      toast.success("Subcategory deleted successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "subcategory");
    },
  });

  const changeSubcategoryStatusMutation = useMutation({
    mutationFn: (id) => 
      axios.patch(`${base_url}/api/subcategory/${id}/status`, {}, { headers }),
    onSuccess: () => {
      toast.success("Subcategory status updated successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "subcategory status");
    },
  });

  // Sub-subcategory Mutations
  const addSubSubcategoryMutation = useMutation({
    mutationFn: (formData) => {
      console.log('Creating sub-subcategory:', formData);
      return axios.post(`${base_url}/api/sub-subcategory`, formData, { headers });
    },
    onSuccess: () => {
      toast.success("Sub-subcategory added successfully");
      queryClient.invalidateQueries(["categories"]); 
    },
    onError: (err) => {
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "sub-subcategory");
    },
  });

  const updateSubSubcategoryMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      console.log('Updating sub-subcategory:', { id, formData });
      if (!id) {
        throw new Error('Sub-subcategory ID is required for update');
      }
      return axios.patch(`${base_url}/api/sub-subcategory/${id}`, formData, { headers });
    },
    onSuccess: () => {
      toast.success("Sub-subcategory updated successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "sub-subcategory");
    },
  });

  const deleteSubSubcategoryMutation = useMutation({
    mutationFn: (id) => {
      console.log('Deleting sub-subcategory:', id);
      return axios.delete(`${base_url}/api/sub-subcategory/${id}`, { headers });
    },
    onSuccess: () => {
      toast.success("Sub-subcategory deleted successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "sub-subcategory");
    },
  });

  const changeSubSubcategoryStatusMutation = useMutation({
    mutationFn: (id) => {
      console.log('Changing sub-subcategory status:', id);
      return axios.patch(`${base_url}/api/sub-subcategory/${id}/status`, {}, { headers });
    },
    onSuccess: () => {
      toast.success("Sub-subcategory status updated successfully");
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      console.error('Status update error:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "sub-subcategory status");
    },
  });

  const handleFormError = (err, entity = "item") => {
    const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || `Failed to submit ${entity}`;
    console.error(`Form error details for ${entity}:`, {
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
      (category.name && category.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteCategory = (id) => {
    if (window.confirm("Are you sure you want to delete this category? This will also delete all its subcategories.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleCategoryStatusChange = (id) => {
    statusChangeMutation.mutate({ id });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      isActive: formData.get("status") === "Active",
    };

    try {
      if (selectedCategory?._id) { // Check if _id exists for selectedCategory
        await updateCategoryMutation.mutateAsync({
          id: selectedCategory._id,
          formData: data,
        });
      } else {
        await addCategoryMutation.mutateAsync(data);
      }
      setIsModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
       // Error is handled by mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subcategory Handlers
  const handleDeleteSubcategory = (id) => {
    if (window.confirm("Are you sure you want to delete this subcategory?")) {
      deleteSubcategoryMutation.mutate(id);
    }
  };

  const handleSubcategoryStatusChange = (id) => {
    changeSubcategoryStatusMutation.mutate(id);
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const subcategoryData = {
      name: formData.get("subcategory-name"),
      description: formData.get("subcategory-description"),
      isActive: formData.get("subcategory-status") === "Active",
      category: selectedCategory?._id, // Parent category ID
    };

    try {
      console.log('Submitting subcategory:', {
        isEdit: !!selectedSubcategory?._id,
        data: subcategoryData,
        selectedSubcategory
      });

      if (selectedSubcategory?._id) {
        // Update existing subcategory
        await updateSubcategoryMutation.mutateAsync({
          id: selectedSubcategory._id,
          formData: {
            name: subcategoryData.name,
            description: subcategoryData.description,
            isActive: subcategoryData.isActive
          }
        });
      } else {
        // Create new subcategory
        if (!subcategoryData.category) {
          toast.error("Parent category ID is missing.");
          setIsSubmitting(false);
          return;
        }
        await addSubcategoryMutation.mutateAsync(subcategoryData);
      }
      setIsSubcategoryModalOpen(false);
      setSelectedSubcategory(null);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Subcategory submission error:', {
        error,
        response: error.response?.data,
        status: error.response?.status
      });
      // Error is handled by mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sub-subcategory Handlers
  const handleSubSubcategorySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const subSubcategoryData = {
      name: formData.get("sub-subcategory-name"),
      description: formData.get("sub-subcategory-description"),
      isActive: formData.get("sub-subcategory-status") === "Active",
      category: selectedCategory?._id, // Update to match API structure
      subcategory: selectedSubcategory?._id, // Update to match API structure
      slug: formData.get("sub-subcategory-name").toLowerCase().replace(/\s+/g, '-')
    };

    try {
      console.log('Submitting sub-subcategory:', {
        isEdit: !!selectedSubSubcategory?._id,
        data: subSubcategoryData,
        selectedSubSubcategory,
        selectedCategory,
        selectedSubcategory
      });

      if (!subSubcategoryData.category || !subSubcategoryData.subcategory) {
        toast.error("Parent category and subcategory are required.");
        setIsSubmitting(false);
        return;
      }

      if (selectedSubSubcategory?._id) {
        // Update existing sub-subcategory
        await updateSubSubcategoryMutation.mutateAsync({
          id: selectedSubSubcategory._id,
          formData: {
            name: subSubcategoryData.name,
            description: subSubcategoryData.description,
            isActive: subSubcategoryData.isActive,
            slug: subSubcategoryData.slug,
            category: subSubcategoryData.category,
            subcategory: subSubcategoryData.subcategory
          }
        });
      } else {
        // Create new sub-subcategory
        await addSubSubcategoryMutation.mutateAsync(subSubcategoryData);
      }
      setIsSubSubcategoryModalOpen(false);
      setSelectedSubSubcategory(null);
      setSelectedSubcategory(null);
      setSelectedCategory(null);
      queryClient.invalidateQueries(["sub-subcategories"]);
      queryClient.invalidateQueries(["categories"]);
    } catch (error) {
      console.error('Sub-subcategory submission error:', {
        error,
        response: error.response?.data,
        status: error.response?.status,
        data: subSubcategoryData
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubSubcategoryStatusChange = (id) => {
    if (!id) {
      console.error('Invalid sub-subcategory ID for status change');
      toast.error("Cannot update status: Invalid sub-subcategory ID");
      return;
    }
    try {
      changeSubSubcategoryStatusMutation.mutate(id);
    } catch (error) {
      console.error('Error changing sub-subcategory status:', error);
      toast.error("Failed to update sub-subcategory status");
    }
  };

  const handleDeleteSubSubcategory = (id) => {
    if (!id) {
      console.error('Invalid sub-subcategory ID for deletion');
      toast.error("Cannot delete: Invalid sub-subcategory ID");
      return;
    }
    if (window.confirm("Are you sure you want to delete this sub-subcategory?")) {
      try {
        deleteSubSubcategoryMutation.mutate(id);
      } catch (error) {
        console.error('Error deleting sub-subcategory:', error);
        toast.error("Failed to delete sub-subcategory");
      }
    }
  };

  // Update the renderSubSubcategories function
  const renderSubSubcategories = (subcategory, category) => {
    if (!expandedSubcategories.has(subcategory._id)) return null;

    // Get sub-subcategories for this specific subcategory only
    const subSubList = (subSubcategories[subcategory._id] || [])
      .filter(subSub => 
        subSub.subcategory === subcategory._id && 
        subSub.category === category._id
      );
    
    console.log('Rendering sub-subcategories for subcategory:', {
      subcategoryId: subcategory._id,
      categoryId: category._id,
      subSubList
    });

    return (
      <>
        {isLoadingSubSub && (
          <tr>
            <td colSpan="4" className="px-6 py-4 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            </td>
          </tr>
        )}
        {!isLoadingSubSub && subSubList.length === 0 && (
          <tr>
            <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
              No sub-subcategories found
            </td>
          </tr>
        )}
        {!isLoadingSubSub && subSubList.map((subSubcategory) => (
          <tr 
            key={`sub-subcategory-${subSubcategory._id}-${subcategory._id}`}
            className="bg-gray-100 hover:bg-gray-200"
          >
            <td className="px-6 py-4 whitespace-nowrap pl-20">
              <div className="text-sm font-medium text-gray-600">
                <span className="text-gray-400 mr-1">&#9492;</span> {subSubcategory.name}
                {subSubcategory.slug && (
                  <span className="ml-2 text-xs text-gray-500">({subSubcategory.slug})</span>
                )}
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="text-sm text-gray-500 max-w-xs truncate" title={subSubcategory.description}>
                {subSubcategory.description}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <select
                value={subSubcategory.isActive ? "Active" : "Inactive"}
                onChange={() => handleSubSubcategoryStatusChange(subSubcategory._id)}
                className={`text-sm rounded-full px-2 py-1 font-semibold border-0 cursor-pointer focus:ring-0 ${
                  subSubcategory.isActive
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-red-100 text-red-800 hover:bg-red-200"
                }`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
              <button
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedSubcategory(subcategory);
                  setSelectedSubSubcategory(subSubcategory);
                  setIsSubSubcategoryModalOpen(true);
                }}
                className="text-primary-600 hover:text-primary-700 p-1 rounded-md hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title="Edit Sub-subcategory"
              >
                <FiEdit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDeleteSubSubcategory(subSubcategory._id)}
                className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Delete Sub-subcategory"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </td>
          </tr>
        ))}
      </>
    );
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
            setSelectedCategory(null); // Clear selected category for Add mode
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
                Category / Subcategory
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
            {filteredCategories
              .filter(category => category && (category._id || category.id))
              .map((category) => (
              <Fragment key={`category-${category._id || category.id}`}>
                {/* Category Row */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleCategory(category._id || category.id)}
                        className="mr-2 text-gray-400 hover:text-gray-500 focus:outline-none p-1 rounded-full hover:bg-gray-200"
                        title={expandedCategories.has(category._id || category.id) ? "Collapse" : "Expand"}
                      >
                        {expandedCategories.has(category._id || category.id) ? (
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
                    <div className="text-sm text-gray-500 max-w-xs truncate" title={category.description}>
                      {category.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={category.isActive ? "Active" : "Inactive"}
                      onChange={() => handleCategoryStatusChange(category._id || category.id)}
                      className={`text-sm rounded-full px-2 py-1 font-semibold border-0 cursor-pointer focus:ring-0 ${ 
                        category.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                    <button
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedSubcategory(null);
                        setIsSubcategoryModalOpen(true);
                      }}
                      className="text-green-600 hover:text-green-700 p-1 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                      title="Add Subcategory"
                    >
                      <FiPlus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsModalOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-700 p-1 rounded-md hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      title="Edit Category"
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category._id || category.id)}
                      className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Delete Category"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>

                {/* Subcategory Rows */}
                {expandedCategories.has(category._id) &&
                  (category.subcategories || [])
                    .filter(sub => sub && sub._id)
                    .map((subcategory) => (
                    <Fragment key={`subcategory-${subcategory._id}`}>
                      <tr className="bg-gray-50 hover:bg-gray-100">
                        <td className="px-6 py-4 whitespace-nowrap pl-12">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleSubcategory(subcategory._id)}
                              className="mr-2 text-gray-400 hover:text-gray-500 focus:outline-none p-1 rounded-full hover:bg-gray-200"
                              title={expandedSubcategories.has(subcategory._id) ? "Collapse" : "Expand"}
                            >
                              {expandedSubcategories.has(subcategory._id) ? (
                                <FiChevronDown className="w-5 h-5" />
                              ) : (
                                <FiChevronRight className="w-5 h-5" />
                              )}
                            </button>
                            <div className="text-sm font-medium text-gray-700">
                              <span className="text-gray-400 mr-1">&#9492;</span> {subcategory.name}
                              {subcategory.slug && (
                                <span className="ml-2 text-xs text-gray-500">({subcategory.slug})</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate" title={subcategory.description}>
                            {subcategory.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={subcategory.isActive ? "Active" : "Inactive"}
                            onChange={() => handleSubcategoryStatusChange(subcategory._id)}
                            className={`text-sm rounded-full px-2 py-1 font-semibold border-0 cursor-pointer focus:ring-0 ${ 
                              subcategory.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                          <button
                            onClick={() => {
                              setSelectedCategory(category);
                              setSelectedSubcategory(subcategory);
                              setSelectedSubSubcategory(null);
                              setIsSubSubcategoryModalOpen(true);
                            }}
                            className="text-green-600 hover:text-green-700 p-1 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                            title="Add Sub-subcategory"
                          >
                            <FiPlus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCategory(category);
                              setSelectedSubcategory(subcategory);
                              setIsSubcategoryModalOpen(true);
                            }}
                            className="text-primary-600 hover:text-primary-700 p-1 rounded-md hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            title="Edit Subcategory"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(subcategory._id)}
                            className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Delete Subcategory"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                      {/* Render sub-subcategories */}
                      {renderSubSubcategories(subcategory, category)}
                    </Fragment>
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
            onClick={() => { setIsModalOpen(false); setSelectedCategory(null); }}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedCategory?._id ? "Edit Category" : "Add Category"}
                    </h2>
                    <button
                      onClick={() => { setIsModalOpen(false); setSelectedCategory(null); }}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-6 py-4">
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
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
                        defaultValue={selectedCategory?.name || ""}
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
                        defaultValue={selectedCategory?.slug || ""}
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
                        defaultValue={selectedCategory?.description || ""}
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
                        onClick={() => { setIsModalOpen(false); setSelectedCategory(null); }}
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
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {selectedCategory?._id ? "Saving..." : "Adding..."}
                          </span>
                        ) : selectedCategory?._id ? (
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

      {/* Subcategory Modal */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              setIsSubcategoryModalOpen(false);
              setSelectedSubcategory(null);
              setSelectedCategory(null);
            }}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedSubcategory?._id ? "Edit Subcategory" : `Add Subcategory to ${selectedCategory?.name || 'Category'}`}
                    </h2>
                    <button
                      onClick={() => {
                        setIsSubcategoryModalOpen(false);
                        setSelectedSubcategory(null);
                        setSelectedCategory(null);
                      }}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-6 py-4">
                  <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                    {selectedCategory && !selectedSubcategory?._id && (
                        <div className="mb-4 p-3 bg-gray-100 rounded-md">
                            <p className="text-sm text-gray-600">Adding to Category: 
                                <span className="font-semibold text-gray-800"> {selectedCategory.name}</span>
                            </p>
                        </div>
                    )}
                     {selectedSubcategory?._id && selectedCategory && (
                        <div className="mb-4 p-3 bg-gray-100 rounded-md">
                            <p className="text-sm text-gray-600">Parent Category: 
                                <span className="font-semibold text-gray-800"> {selectedCategory.name}</span>
                            </p>
                        </div>
                    )}
                    <div>
                      <label
                        htmlFor="subcategory-name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Subcategory Name
                      </label>
                      <input
                        type="text"
                        id="subcategory-name"
                        name="subcategory-name"
                        defaultValue={selectedSubcategory?.name || ""}
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
                        name="subcategory-description"
                        rows={3}
                        defaultValue={selectedSubcategory?.description || ""}
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
                        name="subcategory-status"
                        defaultValue={selectedSubcategory?.isActive === false ? "Inactive" : "Active"} 
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubcategoryModalOpen(false);
                          setSelectedSubcategory(null);
                          setSelectedCategory(null);
                        }}
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
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {selectedSubcategory?._id ? "Saving..." : "Adding..."}
                          </span>
                        ) : selectedSubcategory?._id ? (
                          "Save Changes"
                        ) : (
                          "Add Subcategory"
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

      {/* Sub-subcategory Modal */}
      {isSubSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              setIsSubSubcategoryModalOpen(false);
              setSelectedSubSubcategory(null);
              setSelectedSubcategory(null);
              setSelectedCategory(null);
            }}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedSubSubcategory?._id ? "Edit Sub-subcategory" : `Add Sub-subcategory to ${selectedSubcategory?.name || 'Subcategory'}`}
                    </h2>
                    <button
                      onClick={() => {
                        setIsSubSubcategoryModalOpen(false);
                        setSelectedSubSubcategory(null);
                        setSelectedSubcategory(null);
                        setSelectedCategory(null);
                      }}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-6 py-4">
                  <form onSubmit={handleSubSubcategorySubmit} className="space-y-4">
                    {selectedSubcategory && !selectedSubSubcategory?._id && (
                        <div className="mb-4 p-3 bg-gray-100 rounded-md">
                            <p className="text-sm text-gray-600">Adding to Subcategory: 
                                <span className="font-semibold text-gray-800"> {selectedSubcategory.name}</span>
                            </p>
                        </div>
                    )}
                     {selectedSubSubcategory?._id && selectedSubcategory && (
                        <div className="mb-4 p-3 bg-gray-100 rounded-md">
                            <p className="text-sm text-gray-600">Parent Subcategory: 
                                <span className="font-semibold text-gray-800"> {selectedSubcategory.name}</span>
                            </p>
                        </div>
                    )}
                    <div>
                      <label
                        htmlFor="sub-subcategory-name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Sub-subcategory Name
                      </label>
                      <input
                        type="text"
                        id="sub-subcategory-name"
                        name="sub-subcategory-name"
                        defaultValue={selectedSubSubcategory?.name || ""}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sub-subcategory-description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="sub-subcategory-description"
                        name="sub-subcategory-description"
                        rows={3}
                        defaultValue={selectedSubSubcategory?.description || ""}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sub-subcategory-status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        id="sub-subcategory-status"
                        name="sub-subcategory-status"
                        defaultValue={selectedSubSubcategory?.isActive === false ? "Inactive" : "Active"} 
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubSubcategoryModalOpen(false);
                          setSelectedSubSubcategory(null);
                          setSelectedSubcategory(null);
                          setSelectedCategory(null);
                        }}
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
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {selectedSubSubcategory?._id ? "Saving..." : "Adding..."}
                          </span>
                        ) : selectedSubSubcategory?._id ? (
                          "Save Changes"
                        ) : (
                          "Add Sub-subcategory"
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
