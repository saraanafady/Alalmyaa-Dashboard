import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { base_url } from "../../constants/axiosConfig";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";

const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z
    .string()
    .regex(
      /^(01[0-9]{9}|(\+20)[0-9]{10})$/,
      "Please enter a valid Egyptian phone number (e.g., 01XXXXXXXXX or +20XXXXXXXXXX)"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupUser = async (data) => {
  const response = await axios.post(`${base_url}/api/auth/register`, data);
  return response.data;
};

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(signUpSchema),
  });

  const signupMutation = useMutation({
    mutationFn: signupUser,
    onSuccess: () => {
      navigate("/login");
    },
    onError: (error) => {
      if (error.response?.data?.errors) {
        // Handle validation errors from the server
        const serverErrors = error.response.data.errors;
        Object.keys(serverErrors).forEach((key) => {
          setError(key, {
            type: "server",
            message: serverErrors[key][0],
          });
        });
      } else {
        // Handle other errors
        setError("root", {
          type: "server",
          message: "An error occurred during signup. Please try again.",
        });
      }
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      await signupMutation.mutateAsync(data);
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <svg
            className="mx-auto h-12 w-12 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Join us and start your journey
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                {...register("firstName")}
                className={`w-full px-4 py-3 border ${
                  errors.firstName ? "border-red-300" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white focus:border-indigo-500 outline-none transition-all placeholder-gray-400`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                {...register("lastName")}
                className={`w-full px-4 py-3 border ${
                  errors.lastName ? "border-red-300" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white focus:border-indigo-500 outline-none transition-all placeholder-gray-400`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              type="email"
              {...register("email")}
              className={`w-full px-4 py-3 border ${
                errors.email ? "border-red-300" : "border-gray-300"
              } rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white focus:border-indigo-500 outline-none transition-all placeholder-gray-400`}
              placeholder="name@company.com"
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              {...register("phoneNumber")}
              className={`w-full px-4 py-3 border ${
                errors.phoneNumber ? "border-red-300" : "border-gray-300"
              } rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white focus:border-indigo-500 outline-none transition-all placeholder-gray-400`}
              placeholder="01XXXXXXXXX"
            />
            {errors.phoneNumber && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              className={`w-full px-4 py-3 border ${
                errors.password ? "border-red-300" : "border-gray-300"
              } rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white focus:border-indigo-500 outline-none transition-all placeholder-gray-400`}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
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
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
