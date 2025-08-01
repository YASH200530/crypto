import { useState, useEffect } from "react";
import { getUserProfile, updateUserProfile } from "../services/api";

export default function UserProfile() {
  const [form, setForm] = useState({
    fullName: "",
    pan: "",
    UPI: "",
    account: "",
    ifsc: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await getUserProfile();
        setForm(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const validate = () => {
    const newErrors = {};

    if (!/^[a-zA-Z\s]{3,}$/.test(form.fullName)) {
      newErrors.fullName = "Name must be at least 3 characters and contain only letters and spaces.";
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan)) {
      newErrors.pan = "Invalid PAN format (e.g. ABCDE1234F)";
    }

    if (!/^[\w.-]+@[\w.-]+$/.test(form.gpay)) {
      newErrors.UPI = "Invalid GPay ID (e.g. name@upi)";
    }

    if (!/^\d{9,18}$/.test(form.account)) {
      newErrors.account = "Account number must be 9 to 18 digits.";
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
      newErrors.ifsc = "Invalid IFSC Code (e.g. SBIN0123456)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await updateUserProfile(form);
      alert("Details saved successfully!");
    } catch (error) {
      alert("Error saving details: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white dark:bg-gray-800 p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-900 dark:text-white">Update Profile</h2>
      <form onSubmit={handleSubmit}>
        {[
          { name: "fullName", label: "Full Name" },
          { name: "pan", label: "PAN Card Number" },
          { name: "UPI", label: " UPI" },
          { name: "account", label: "Bank Account Number" },
          { name: "ifsc", label: "IFSC Code" },
        ].map(({ name, label }) => (
          <div key={name} className="mb-4">
            <input
              type="text"
              name={name}
              placeholder={label}
              value={form[name]}
              onChange={handleChange}
              className={`w-full p-2 border rounded dark:bg-gray-700 dark:text-white ${
                errors[name] ? "border-red-500" : ""
              }`}
            />
            {errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>}
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Saving..." : "Save Details"}
        </button>
      </form>
    </div>
    
  );
}
