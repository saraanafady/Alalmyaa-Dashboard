import React, { useEffect, useContext } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import axios from "axios";
import slugify from "slugify";
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const LocaleContext = React.createContext({ locale: "en" });

const API_BASE_URL = "http://localhost:3000/api";

const ProductCreationForm = ({ defaultValues, onSubmitSuccess }) => {
  const { locale } = useContext(LocaleContext);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues || {
      name: { en: "", ar: "" },
      slug: { en: "", ar: "" },
      shortDescription: { en: "", ar: "" },
      details: { en: "", ar: "" },
      images: [],
      basePrice: 0,
      variants: [
        {
          name: { en: "Configuration", ar: "التكوين" },
          options: [
            {
              value: { en: "", ar: "" },
              colorName: { en: "", ar: "" },
              colorHex: "",
              colorSwatchImage: "",
              storage: "",
              ram: "",
              price: 0,
              discount: 0,
              stock: 0,
              variantImages: [],
            },
          ],
        },
      ],
      specifications: [
        {
          name: { en: "", ar: "" },
          value: "",
          unit: { en: "", ar: "" },
          isFilterable: false,
        },
      ],
      category: "",
      subCategory: "",
      subSubcategory: "",
      brand: "",
      isFeatured: false,
      isActive: true,
    },
  });

  const watchCategory = watch("category");
  const watchSubCategory = watch("subCategory");
  const watchProductNameEn = watch("name.en");
  const watchProductNameAr = watch("name.ar");

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });
  const {
    fields: specFields,
    append: appendSpec,
    remove: removeSpec,
  } = useFieldArray({ control, name: "specifications" });

  // --- React Query for Dropdown Data ---
  const {
    data: allCategories = [],
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/categories`);
      // نفترض أن التصنيفات تأتي متداخلة كما في البيانات المرسلة
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
  });

  // حذف جلب التصنيفات الفرعية والفرعية الفرعية من API منفصل
  // const { ... } = useQuery({ ... subcategories ... });
  // const { ... } = useQuery({ ... subsubcategories ... });

  // --- اختيار التصنيف الرئيسي والفرعي والفرعي الفرعي من نفس الكائن ---
  const selectedCategoryObj = allCategories.find(
    (cat) => cat._id === watchCategory
  );
  const selectedSubCategoryObj = selectedCategoryObj?.subcategories?.find(
    (sub) => sub._id === watchSubCategory
  );

  // --- Effect for Slug Generation ---
  useEffect(() => {
    if (watchProductNameEn) {
      const generatedSlugEn = slugify(watchProductNameEn, {
        lower: true,
        strict: true,
      });
      setValue("slug.en", generatedSlugEn);
    }
    if (watchProductNameAr) {
      const generatedSlugAr = slugify(watchProductNameAr, {
        lower: true,
        strict: true,
      });
      setValue("slug.ar", generatedSlugAr);
    }
  }, [watchProductNameEn, watchProductNameAr, setValue]);

  // --- React Query Mutation for Image Upload ---
  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      if (files.length === 0) return [];
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data.files;
    },
    onError: (error) => {
      console.error(
        "Upload Mutation Error:",
        error.response?.data || error.message
      );
      alert(
        "Failed to upload files: " +
          (error.response?.data?.message || error.message)
      );
    },
  });

  // --- Handle Main Product Image Upload ---
  const handleMainImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = ""; // Clear file input immediately

    try {
      const uploaded = await uploadMutation.mutateAsync(files);
      const newImages = uploaded.map((img) => ({
        url: img.url,
        altText: { en: "", ar: "" },
        isFeatured: false,
        public_id: img.public_id,
      }));
      const currentImages = watch("images") || [];
      setValue("images", [...currentImages, ...newImages]);
    } catch {
      // Error handled by uploadMutation.onError
    }
  };

  // --- Handle Variant Image Upload ---
  const handleVariantImageUpload = async (
    event,
    variantTypeIndex,
    optionIndex
  ) => {
    const files = Array.from(event.target.files);
    event.target.value = ""; // Clear file input immediately

    try {
      const uploaded = await uploadMutation.mutateAsync(files);
      const newVariantImages = uploaded.map((img) => ({
        url: img.url,
        altText: { en: "", ar: "" },
        public_id: img.public_id,
      }));

      const currentVariantOptions =
        watch(`variants.${variantTypeIndex}.options`) || [];
      const currentOption = currentVariantOptions[optionIndex] || {};
      const currentVariantImages = currentOption.variantImages || [];

      setValue(
        `variants.${variantTypeIndex}.options.${optionIndex}.variantImages`,
        [...currentVariantImages, ...newVariantImages]
      );
    } catch {
      // Error handled by uploadMutation.onError
    }
  };

  // --- Remove Image (Main) ---
  const removeMainImage = (indexToRemove) => {
    const currentImages = watch("images");
    const updatedImages = currentImages.filter(
      (_, idx) => idx !== indexToRemove
    );
    setValue("images", updatedImages);
  };

  // --- Remove Image (Variant) ---
  const removeVariantImage = (
    variantTypeIndex,
    optionIndex,
    imageIndexToRemove
  ) => {
    const currentVariantOptions = watch(`variants.${variantTypeIndex}.options`);
    const currentVariantImages =
      currentVariantOptions[optionIndex].variantImages;
    const updatedVariantImages = currentVariantImages.filter(
      (_, idx) => idx !== imageIndexToRemove
    );
    setValue(
      `variants.${variantTypeIndex}.options.${optionIndex}.variantImages`,
      updatedVariantImages
    );
  };

  // --- React Query Mutation for Product Creation ---
  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const response = await axios.post(`${API_BASE_URL}/product`, productData);
      return response.data;
    },
    onSuccess: (data) => {
      alert("Product created successfully!");
      reset();
      onSubmitSuccess && onSubmitSuccess(data);
    },
    onError: (error) => {
      console.error(
        "Create Product Mutation Error:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.message || "An unexpected error occurred.";
      const errorDetails = error.response?.data?.errors
        ? JSON.stringify(error.response.data.errors, null, 2)
        : "";
      alert(`Error creating product: ${errorMessage}\n${errorDetails}`);
    },
  });

  // --- Form Submission Handler ---
  const onSubmit = (data) => {
    // Convert empty strings to null for optional fields
    if (data.subCategory === "") data.subCategory = null;
    if (data.subSubcategory === "") data.subSubcategory = null;

    // معالجة قيمة value (en/ar) وcolorName (en/ar) وcolorHex وصور المتغيرات في كل خيار من خيارات المتغيرات
    if (Array.isArray(data.variants)) {
      data.variants.forEach((variant) => {
        if (Array.isArray(variant.options) && variant.options.length > 0) {
          const firstValueEn = variant.options[0]?.value?.en || "";
          const firstValueAr = variant.options[0]?.value?.ar || "";
          const firstColorEn = variant.options[0]?.colorName?.en || "";
          const firstColorAr = variant.options[0]?.colorName?.ar || "";
          const firstColorHex = variant.options[0]?.colorHex || "";
          const firstImages = variant.options[0]?.variantImages || [];
          variant.options.forEach((option, idx) => {
            if (!option.value) option.value = {};
            if (!option.value.en) option.value.en = firstValueEn;
            if (!option.value.ar) option.value.ar = firstValueAr;
            if (!option.colorName) option.colorName = {};
            if (!option.colorName.en) option.colorName.en = firstColorEn;
            if (!option.colorName.ar) option.colorName.ar = firstColorAr;
            if (!option.colorHex) option.colorHex = firstColorHex;
            if (idx !== 0) option.variantImages = firstImages;
          });
        }
      });
    }

    createProductMutation.mutate(data);
  };

  const isFormSubmitting =
    createProductMutation.isPending || uploadMutation.isPending;

  const renderMainImage = (img, index) => {
    if (!img || !img.url) return null;

    const altText = (img && typeof img.altText === "object" && img.altText) || {
      en: "",
      ar: "",
    };

    return (
      <div
        key={img.url + index}
        className="relative group overflow-hidden rounded-md shadow-sm border border-gray-200"
      >
        {img.url.match(/\.(mp4|mov|avi)$/i) ? (
          <video
            src={img.url}
            controls
            className="w-full h-32 object-cover"
          ></video>
        ) : (
          <img
            src={img.url}
            alt={altText.en || ""}
            className="w-full h-32 object-cover"
          />
        )}
        <button
          type="button"
          onClick={() => removeMainImage(index)}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          &times;
        </button>
        <div className="p-1">
          <label className="block text-xs font-medium text-gray-600">
            Alt Text (EN)
          </label>
          <input
            type="text"
            {...register(`images.${index}.altText.en`)}
            className="w-full text-xs p-1 border rounded"
          />
          <label className="block text-xs font-medium text-gray-600 mt-1">
            Alt Text (AR)
          </label>
          <input
            type="text"
            {...register(`images.${index}.altText.ar`)}
            className="w-full text-xs p-1 border rounded"
          />
        </div>
      </div>
    );
  };

  // --- جلب بيانات العلامات التجارية (brands) ---
  const {
    data: allBrands = [],
    isLoading: isLoadingBrands,
    isError: isErrorBrands,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/brand`);
      return Array.isArray(res.data.data.brands) ? res.data.data.brands : [];
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-6 bg-white rounded-lg shadow-md w-full mx-auto my-8"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {defaultValues ? "Edit Product" : "Add New Product"}
      </h2>

      {/* Basic Product Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="name.en"
            className="block text-sm font-medium text-gray-700"
          >
            Product Name (English)
          </label>
          <input
            id="name.en"
            {...register("name.en", { required: "English Name is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          />
          {errors.name?.en && (
            <p className="text-red-500 text-xs mt-1">
              {errors.name.en.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="name.ar"
            className="block text-sm font-medium text-gray-700"
          >
            Product Name (Arabic)
          </label>
          <input
            id="name.ar"
            {...register("name.ar", { required: "Arabic Name is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          />
          {errors.name?.ar && (
            <p className="text-red-500 text-xs mt-1">
              {errors.name.ar.message}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="shortDescription.en"
          className="block text-sm font-medium text-gray-700"
        >
          Short Description (English)
        </label>
        <textarea
          id="shortDescription.en"
          {...register("shortDescription.en")}
          rows="2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
        ></textarea>
      </div>
      <div className="mb-6">
        <label
          htmlFor="shortDescription.ar"
          className="block text-sm font-medium text-gray-700"
        >
          Short Description (Arabic)
        </label>
        <textarea
          id="shortDescription.ar"
          {...register("shortDescription.ar")}
          rows="2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
        ></textarea>
      </div>

      {/* Rich Text Editor for Details */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Details (English)
        </label>
        <Controller
          name="details.en"
          control={control}
          rules={{ required: "English Details are required" }}
          render={({ field }) => (
            <TiptapEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.details?.en && (
          <p className="text-red-500 text-xs mt-1">
            {errors.details.en.message}
          </p>
        )}
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Details (Arabic)
        </label>
        <Controller
          name="details.ar"
          control={control}
          rules={{ required: "Arabic Details are required" }}
          render={({ field }) => (
            <TiptapEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.details?.ar && (
          <p className="text-red-500 text-xs mt-1">
            {errors.details.ar.message}
          </p>
        )}
      </div>

      {/* Price Field */}
      <div className="mb-6">
        <label
          htmlFor="basePrice"
          className="block text-sm font-medium text-gray-700"
        >
          Base Price
        </label>
        <input
          id="basePrice"
          type="number"
          step="0.01"
          {...register("basePrice", {
            required: "Base Price is required",
            valueAsNumber: true,
            min: { value: 0, message: "Price must be positive" },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
        />
        {errors.basePrice && (
          <p className="text-red-500 text-xs mt-1">
            {errors.basePrice.message}
          </p>
        )}
      </div>

      {/* Category & Brand Selects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Category
          </label>
          {isLoadingCategories ? (
            <p>Loading categories...</p>
          ) : isErrorCategories ? (
            <p className="text-red-500">Error loading categories</p>
          ) : (
            <select
              id="category"
              {...register("category", { required: "Category is required" })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="">Select Category</option>
              {allCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {typeof cat.name === "object" ? cat.name[locale] : cat.name}
                </option>
              ))}
            </select>
          )}
          {errors.category && (
            <p className="text-red-500 text-xs mt-1">
              {errors.category.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="subCategory"
            className="block text-sm font-medium text-gray-700"
          >
            Subcategory
          </label>
          <select
            id="subCategory"
            {...register("subCategory")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            disabled={!selectedCategoryObj}
          >
            <option value="">Select Subcategory</option>
            {selectedCategoryObj?.subcategories?.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {typeof sub.name === "object" ? sub.name[locale] : sub.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="subSubcategory"
            className="block text-sm font-medium text-gray-700"
          >
            Sub-Subcategory
          </label>
          <select
            id="subSubcategory"
            {...register("subSubcategory")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            disabled={!selectedSubCategoryObj}
          >
            <option value="">Select Sub-Subcategory</option>
            {selectedSubCategoryObj?.subSubcategories?.map((subsub) => (
              <option key={subsub._id} value={subsub._id}>
                {typeof subsub.name === "object"
                  ? subsub.name[locale]
                  : subsub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Brand Select */}
      <div className="mb-6">
        <label
          htmlFor="brand"
          className="block text-sm font-medium text-gray-700"
        >
          Brand
        </label>
        {isLoadingBrands ? (
          <p>Loading brands...</p>
        ) : isErrorBrands ? (
          <p className="text-red-500">Error loading brands</p>
        ) : (
          <select
            id="brand"
            {...register("brand", { required: "Brand is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          >
            <option value="">Select Brand</option>
            {Array.isArray(allBrands) &&
              allBrands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.logoUrl ? "🖼️ " : ""}
                  {brand.name}
                </option>
              ))}
          </select>
        )}
        {errors.brand && (
          <p className="text-red-500 text-xs mt-1">{errors.brand.message}</p>
        )}
      </div>

      {/* Main Product Images */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Main Product Images
        </h3>
        <input
          type="file"
          multiple
          onChange={handleMainImageUpload}
          accept="image/*,video/*"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          disabled={uploadMutation.isPending}
        />
        {uploadMutation.isPending && (
          <p className="text-indigo-600 mt-2">Uploading main images...</p>
        )}
        {uploadMutation.isError && (
          <p className="text-red-500 mt-2">
            Error uploading: {uploadMutation.error.message}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(watch("images") || []).map((img, index) =>
            renderMainImage(img, index)
          )}
        </div>
      </div>

      {/* Variants Section */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            {locale === "ar" ? "متغيرات المنتج" : "Product Variants"}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                appendVariant({ name: { en: "", ar: "" }, options: [] })
              }
              className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              {locale === "ar" ? "إضافة نوع متغير" : "Add Variant Type"}
            </button>
          </div>
        </div>

        {variantFields.map((variantType, variantTypeIndex) => (
          <div
            key={variantType.id}
            className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-700">
                {locale === "ar"
                  ? `نوع المتغير #${variantTypeIndex + 1}`
                  : `Variant Type #${variantTypeIndex + 1}`}
              </h4>
              <button
                type="button"
                onClick={() => removeVariant(variantTypeIndex)}
                className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                {locale === "ar" ? "حذف" : "Remove"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {locale === "ar"
                    ? "اسم المتغير (الإنجليزية)"
                    : "Variant Name (English)"}
                </label>
                <input
                  {...register(`variants.${variantTypeIndex}.name.en`, {
                    required:
                      locale === "ar"
                        ? "اسم المتغير مطلوب"
                        : "Variant name is required",
                  })}
                  placeholder={
                    locale === "ar" ? "مثال: التكوين" : "e.g., Configuration"
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.variants?.[variantTypeIndex]?.name?.en && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants[variantTypeIndex].name.en.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {locale === "ar"
                    ? "اسم المتغير (العربية)"
                    : "Variant Name (Arabic)"}
                </label>
                <input
                  {...register(`variants.${variantTypeIndex}.name.ar`, {
                    required:
                      locale === "ar"
                        ? "اسم المتغير مطلوب"
                        : "Variant name is required",
                  })}
                  placeholder={
                    locale === "ar" ? "مثال: التكوين" : "e.g., Configuration"
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.variants?.[variantTypeIndex]?.name?.ar && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants[variantTypeIndex].name.ar.message}
                  </p>
                )}
              </div>
            </div>

            {/* Options for this variant type */}
            <div className="variant-options mb-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-base font-medium text-gray-700">
                  {locale === "ar" ? "الخيارات" : "Options"}
                </h5>
              </div>
              <VariantOptionsFieldArray
                control={control}
                variantTypeIndex={variantTypeIndex}
                handleVariantImageUpload={handleVariantImageUpload}
                removeVariantImage={removeVariantImage}
                uploadMutation={uploadMutation}
                watch={watch}
                register={register}
                errors={errors}
                locale={locale}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Specifications Section */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Specifications
        </h3>
        {specFields.map((spec, index) => (
          <div
            key={spec.id}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 p-3 border border-gray-200 rounded-md bg-gray-50"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Spec Name (EN)
              </label>
              <input
                {...register(`specifications.${index}.name.en`, {
                  required: "Spec name (EN) is required",
                })}
                placeholder="e.g., Processor"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
              {errors.specifications?.[index]?.name?.en && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.specifications[index].name.en.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Spec Name (AR)
              </label>
              <input
                {...register(`specifications.${index}.name.ar`, {
                  required: "Spec name (AR) is required",
                })}
                placeholder="مثال: المعالج"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
              {errors.specifications?.[index]?.name?.ar && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.specifications[index].name.ar.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Spec Value
              </label>
              <input
                {...register(`specifications.${index}.value`, {
                  required: "Spec value is required",
                })}
                placeholder="e.g., Snapdragon 8 Gen 3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
              {errors.specifications?.[index]?.value && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.specifications[index].value.message}
                </p>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit (EN)
                </label>
                <input
                  {...register(`specifications.${index}.unit.en`)}
                  placeholder="e.g., GHz"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit (AR)
                </label>
                <input
                  {...register(`specifications.${index}.unit.ar`)}
                  placeholder="مثال: جيجاهرتز"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                />
              </div>
              <label className="block text-sm font-medium text-gray-700 flex items-center mt-auto">
                <input
                  type="checkbox"
                  {...register(`specifications.${index}.isFilterable`)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 mr-2"
                />
                Filterable
              </label>
              <button
                type="button"
                onClick={() => removeSpec(index)}
                className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors mt-auto"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            appendSpec({
              name: { en: "", ar: "" },
              value: "",
              unit: { en: "", ar: "" },
              isFilterable: false,
            })
          }
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Add Specification
        </button>
      </div>

      {/* Checkboxes */}
      <div className="mb-6 flex gap-4">
        <label className="inline-flex items-center text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            {...register("isFeatured")}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="ml-2">Featured Product</span>
        </label>
        <label className="inline-flex items-center text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            {...register("isActive")}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="ml-2">Active Product</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isFormSubmitting}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isFormSubmitting ? "Saving..." : "Save Product"}
      </button>

      {/* Global Form Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <h4 className="font-bold">Please correct the following errors:</h4>
          <ul className="list-disc list-inside mt-2">
            {Object.keys(errors).map((key) => {
              const error = errors[key];
              let message = error.message;
              if (
                !message &&
                typeof error === "object" &&
                !Array.isArray(error)
              ) {
                const nestedKeys = Object.keys(error);
                if (nestedKeys.length > 0) {
                  message = error[nestedKeys[0]].message || `Error in ${key}`;
                }
              }
              return <li key={key}>{message || `Error in ${key}`}</li>;
            })}
          </ul>
        </div>
      )}
    </form>
  );
};

// --- Nested Component for Variant Options ---
const VariantOptionsFieldArray = ({
  control,
  variantTypeIndex,
  handleVariantImageUpload,
  removeVariantImage,
  uploadMutation,
  watch,
  register,
  errors,
  locale,
}) => {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: `variants.${variantTypeIndex}.options`,
  });

  const watchOptionFields = watch(`variants.${variantTypeIndex}.options`) || [];

  const renderVariantImage = (img, imgIndex, variantTypeIndex, optionIndex) => {
    if (!img || !img.url) return null;

    const altText = (img && typeof img.altText === "object" && img.altText) || {
      en: "",
      ar: "",
    };

    return (
      <div
        key={img.url + imgIndex}
        className="relative group overflow-hidden rounded-md shadow-sm border border-gray-200"
      >
        {img.url.match(/\.(mp4|mov|avi)$/i) ? (
          <video
            src={img.url}
            controls
            className="w-20 h-20 object-cover"
          ></video>
        ) : (
          <img
            src={img.url}
            alt={altText[locale] || ""}
            className="w-20 h-20 object-cover"
          />
        )}
        <button
          type="button"
          onClick={() =>
            removeVariantImage(variantTypeIndex, optionIndex, imgIndex)
          }
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          &times;
        </button>
        <div className="p-1">
          <label className="block text-xs font-medium text-gray-600">
            {locale === "ar" ? "نص بديل (إنجليزي)" : "Alt Text (EN)"}
          </label>
          <input
            type="text"
            {...register(
              `variants.${variantTypeIndex}.options.${optionIndex}.variantImages.${imgIndex}.altText.en`
            )}
            className="w-full text-xs p-0.5 border rounded"
          />
          <label className="block text-xs font-medium text-gray-600 mt-1">
            {locale === "ar" ? "نص بديل (عربي)" : "Alt Text (AR)"}
          </label>
          <input
            type="text"
            {...register(
              `variants.${variantTypeIndex}.options.${optionIndex}.variantImages.${imgIndex}.altText.ar`
            )}
            className="w-full text-xs p-0.5 border rounded"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {optionFields.map((option, optionIndex) => {
        // إذا لم يكن الخيار الأول، استخدم صور الخيار الأول
        const variantImages =
          optionIndex === 0
            ? watchOptionFields[optionIndex]?.variantImages || []
            : watchOptionFields[0]?.variantImages || [];

        return (
          <div
            key={option.id}
            className="mb-4 p-4 border border-gray-300 rounded-md bg-white shadow-sm"
          >
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-md font-medium text-gray-800">
                {locale === "ar"
                  ? `الخيار #${optionIndex + 1}`
                  : `Option #${optionIndex + 1}`}
              </h5>
              <button
                type="button"
                onClick={() => removeOption(optionIndex)}
                className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                {locale === "ar" ? "حذف" : "Remove"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* إذا كان الخيار الأول، أظهر جميع الحقول */}
              {optionIndex === 0 && (
                <>
                  {/* value.en */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {locale === "ar"
                        ? "قيمة الخيار (إنجليزي)"
                        : "Option Value (EN)"}
                    </label>
                    <input
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.value.en`,
                        {
                          required:
                            locale === "ar"
                              ? "قيمة الخيار مطلوبة"
                              : "Option value is required",
                        }
                      )}
                      placeholder={
                        locale === "ar"
                          ? "مثال: أحمر - 256 جيجابايت"
                          : "e.g., Red - 256GB"
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.variants?.[variantTypeIndex]?.options?.[optionIndex]
                      ?.value?.en && (
                      <p className="text-red-500 text-xs mt-1">
                        {
                          errors.variants[variantTypeIndex].options[optionIndex]
                            .value.en.message
                        }
                      </p>
                    )}
                  </div>
                  {/* value.ar */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {locale === "ar"
                        ? "قيمة الخيار (عربي)"
                        : "Option Value (AR)"}
                    </label>
                    <input
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.value.ar`,
                        {
                          required:
                            locale === "ar"
                              ? "قيمة الخيار مطلوبة"
                              : "Option value is required",
                        }
                      )}
                      placeholder={
                        locale === "ar"
                          ? "مثال: أحمر - 256 جيجابايت"
                          : "e.g., Red - 256GB"
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.variants?.[variantTypeIndex]?.options?.[optionIndex]
                      ?.value?.ar && (
                      <p className="text-red-500 text-xs mt-1">
                        {
                          errors.variants[variantTypeIndex].options[optionIndex]
                            .value.ar.message
                        }
                      </p>
                    )}
                  </div>
                  {/* colorName.en */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {locale === "ar"
                        ? "اسم اللون (إنجليزي)"
                        : "Color Name (EN)"}
                    </label>
                    <input
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.colorName.en`
                      )}
                      placeholder={
                        locale === "ar"
                          ? "مثال: رمادي فلكي"
                          : "e.g., Space Gray"
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  {/* colorName.ar */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {locale === "ar" ? "اسم اللون (عربي)" : "Color Name (AR)"}
                    </label>
                    <input
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.colorName.ar`
                      )}
                      placeholder={
                        locale === "ar"
                          ? "مثال: رمادي فلكي"
                          : "e.g., Space Gray"
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  {/* colorHex */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {locale === "ar" ? "رمز اللون" : "Color Hex Code"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        {...register(
                          `variants.${variantTypeIndex}.options.${optionIndex}.colorHex`
                        )}
                        placeholder="#RRGGBB"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {watchOptionFields?.[optionIndex]?.colorHex &&
                        watchOptionFields[optionIndex].colorHex.match(
                          /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
                        ) && (
                          <div
                            style={{
                              backgroundColor:
                                watchOptionFields[optionIndex].colorHex,
                              width: "40px",
                              height: "40px",
                              borderRadius: "8px",
                              border: "1px solid #ccc",
                              marginTop: "4px",
                            }}
                          ></div>
                        )}
                    </div>
                  </div>
                </>
              )}
              {/* الحقول المشتركة للجميع */}
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "التخزين" : "Storage"}
                </label>
                <input
                  {...register(
                    `variants.${variantTypeIndex}.options.${optionIndex}.storage`
                  )}
                  placeholder={
                    locale === "ar" ? "مثال: 256 جيجابايت" : "e.g., 256GB"
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "الذاكرة العشوائية" : "RAM"}
                </label>
                <input
                  {...register(
                    `variants.${variantTypeIndex}.options.${optionIndex}.ram`
                  )}
                  placeholder={
                    locale === "ar" ? "مثال: 8 جيجابايت" : "e.g., 8GB"
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "السعر" : "Price"}
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    {...register(
                      `variants.${variantTypeIndex}.options.${optionIndex}.price`,
                      {
                        required:
                          locale === "ar" ? "السعر مطلوب" : "Price is required",
                        valueAsNumber: true,
                        min: {
                          value: 0,
                          message:
                            locale === "ar"
                              ? "السعر لا يمكن أن يكون سالباً"
                              : "Price cannot be negative",
                        },
                      }
                    )}
                    className="pl-7 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {errors.variants?.[variantTypeIndex]?.options?.[optionIndex]
                  ?.price && (
                  <p className="text-red-500 text-xs mt-1">
                    {
                      errors.variants[variantTypeIndex].options[optionIndex]
                        .price.message
                    }
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "الخصم (%)" : "Discount (%)"}
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="1"
                    {...register(
                      `variants.${variantTypeIndex}.options.${optionIndex}.discount`,
                      { valueAsNumber: true, min: 0, max: 100 }
                    )}
                    className="pl-7 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                    %
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "المخزون" : "Stock"}
                </label>
                <input
                  type="number"
                  {...register(
                    `variants.${variantTypeIndex}.options.${optionIndex}.stock`,
                    {
                      required:
                        locale === "ar" ? "المخزون مطلوب" : "Stock is required",
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message:
                          locale === "ar"
                            ? "المخزون لا يمكن أن يكون سالباً"
                            : "Stock cannot be negative",
                      },
                    }
                  )}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.variants?.[variantTypeIndex]?.options?.[optionIndex]
                  ?.stock && (
                  <p className="text-red-500 text-xs mt-1">
                    {
                      errors.variants[variantTypeIndex].options[optionIndex]
                        .stock.message
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Variant Images Upload */}
            <div className="mb-4">
              <h6 className="text-sm font-medium text-gray-700 mb-2">
                {locale === "ar" ? "صور المتغير" : "Variant Images"}
              </h6>
              <div className="flex items-center gap-4">
                {optionIndex === 0 && (
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      handleVariantImageUpload(e, variantTypeIndex, optionIndex)
                    }
                    accept="image/*,video/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    disabled={uploadMutation.isPending}
                  />
                )}
                {uploadMutation.isPending && (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <svg
                      className="animate-spin h-5 w-5"
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
                    {locale === "ar" ? "جاري الرفع..." : "Uploading..."}
                  </div>
                )}
              </div>
              {uploadMutation.isError && (
                <p className="text-red-500 mt-2">
                  {locale === "ar" ? "خطأ في الرفع:" : "Error uploading:"}{" "}
                  {uploadMutation.error.message}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {variantImages.map((img, imgIndex) =>
                  renderVariantImage(
                    img,
                    imgIndex,
                    variantTypeIndex,
                    optionIndex
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          appendOption({
            storage: "",
            ram: "",
            price: 0,
            discount: 0,
            stock: 0,
            variantImages: [],
          })
        }
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        {locale === "ar" ? "إضافة خيار" : "Add Option"}
      </button>
    </>
  );
};

// TiptapEditor component for use with react-hook-form Controller
const TiptapEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content if value changes from outside (e.g., form reset)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  return (
    <div className="border rounded-md bg-white shadow-sm min-h-[120px] p-2">
      <EditorContent editor={editor} />
    </div>
  );
};

export default ProductCreationForm;
