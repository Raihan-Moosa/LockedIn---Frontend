"use client";

import { useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import styles from './page.module.css';
import { FaGraduationCap, FaBook, FaPlus, FaMinus, FaEdit, FaTimes, FaUser, FaEnvelope, FaUniversity, FaCalendar } from 'react-icons/fa';
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import React from 'react';

// Helper: load options from txt files
async function fetchOptions(file: string): Promise<string[]> {
  try {
    const resp = await fetch(`/data/${file}`);
    const text = await resp.text();
    return text.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Add interfaces for strong typing
interface Profile {
  id: string;
  full_name: string;
  email: string;
  year: string;
  degree: string;
  gpa: string;
  university: string;
  modules: string[];
  interest: string;
}

interface FormData {
  full_name: string;
  email: string;
  year: string;
  degree: string;
  gpa: string;
  university: string;
  modules: string[];
  interest: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function ProfilePage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const router = useRouter();
  
  // Form states
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    year: '',
    degree: '',
    gpa: '',
    university: '',
    modules: [],
    interest: '',
  });
  
  // Dropdown data
  const [degrees, setDegrees] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  // Form validation
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Get auth headers like in your dashboard
  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : undefined;
  };

  // Load dropdown data
  useEffect(() => {
    fetchOptions("degrees.txt").then(setDegrees);
    fetchOptions("modules.txt").then(setModules);
  }, []);

  // Load profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const headers = await authHeaders();
      if (!headers) {
        throw new Error('Please log in to view your profile');
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.profile) {
        throw new Error('No profile data received');
      }
      
      setProfile(data.profile);
      
      // Initialize form data with proper type checking
      const profileData = data.profile as Profile;
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        year: profileData.year || '',
        degree: profileData.degree || '',
        gpa: profileData.gpa || '',
        university: profileData.university || '',
        modules: profileData.modules || [],
        interest: profileData.interest || ''
      });
      
      setSelectedModules(profileData.modules || []);
      setError('');
      
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  // Add explicit type to event handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Module management
  const addModule = () => setSelectedModules(prev => [...prev, ""]);
  const removeModule = (index: number) => setSelectedModules(prev => prev.filter((_, i) => i !== index));
  const updateModule = (index: number, value: string) =>
    setSelectedModules(prev => prev.map((m, i) => i === index ? value : m));
  const getAvailableModules = (currentIndex: number) => {
    const selectedValues = selectedModules.filter((m, i) => i !== currentIndex && m.trim() !== "");
    return modules.filter(m => !selectedValues.includes(m));
  };

  // Validation with proper typing
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.degree.trim()) errors.degree = 'Degree is required';
    if (selectedModules.filter(m => m !== '').length === 0) {
      errors.modules = 'At least one module is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add proper type for the event parameter
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const headers = await authHeaders();
      
      if (!headers) {
        throw new Error('Please log in to update your profile');
      }

      const updateData = {
        ...formData,
        modules: selectedModules.filter(m => m !== '')
      };
      
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
      const data = await response.json();
      setProfile(data.profile as Profile);
      setIsEditing(false);
      setError('');
      setLoading(false);
      
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      setLoading(false);
    }
  };

  const openEditModal = () => {
    setIsEditing(true);
    setFormErrors({});
  };

  const closeEditModal = () => {
    setIsEditing(false);
    setFormErrors({});
    // Reset form data to profile data with proper typing
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        year: profile.year || '',
        degree: profile.degree || '',
        gpa: profile.gpa || '',
        university: profile.university || '',
        modules: profile.modules || [],
        interest: profile.interest || ''
      });
      setSelectedModules(profile.modules || []);
    }
  };

  // Generate initials for avatar with proper typing
  const getInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading && !profile) {
    return (
      <div className="dashboardLayout">
        <Sidebar />
        <main className="dashboard-wrapper">
          <div className={styles.loading}>Loading profile...</div>
        </main>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (error && error.includes('log in')) {
    return (
      <div className="dashboardLayout">
        <Sidebar />
        <main className="dashboard-wrapper">
          <div className={styles.profileHeader}>
            <h1>👤 My Profile</h1>
          </div>
          <div className={styles.errorMessage}>
            {error}
            <button 
              onClick={handleLoginRedirect}
              className={styles.loginButton}
              style={{ marginLeft: '10px', padding: '8px 16px' }}
            >
              Go to Login
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboardLayout">
      <Sidebar />
      <main className="dashboard-wrapper">
        <div className={styles.profileHeader}>
          <h1>👤 My Profile</h1>
          <button 
            onClick={openEditModal}
            className={styles.editButton}
            disabled={loading}
          >
            <FaEdit /> Edit Profile
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
            <button 
              onClick={fetchProfile} 
              style={{ marginLeft: '10px', padding: '5px 10px' }}
            >
              Retry
            </button>
          </div>
        )}

        <div className={styles.profileContainer}>
          {/* Personal Information Section */}
          <section className={styles.profileSection}>
            <h2>Personal Information</h2>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                {getInitials(profile?.full_name)}
              </div>
              <button className={styles.uploadButton}>Upload Photo</button>
            </div>
            
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label>First Name</label>
                <div className={styles.fieldValue}>
                  <FaUser />
                  {profile?.full_name?.split(' ')[0] || 'Not provided'}
                </div>
              </div>
              <div className={styles.field}>
                <label>Last Name</label>
                <div className={styles.fieldValue}>
                  <FaUser />
                  {profile?.full_name?.split(' ').slice(1).join(' ') || 'Not provided'}
                </div>
              </div>
              <div className={styles.field}>
                <label>Email Address</label>
                <div className={styles.fieldValue}>
                  <FaEnvelope />
                  {profile?.email || 'Not provided'}
                </div>
              </div>
            </div>
          </section>

          {/* Academic Information Section */}
          <section className={styles.profileSection}>
            <h2>Academic Information</h2>
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <label>Year of Study</label>
                <div className={styles.fieldValue}>
                  <FaCalendar />
                  {profile?.year || 'Not provided'}
                </div>
              </div>
              <div className={styles.field}>
                <label>Major/Program</label>
                <div className={styles.fieldValue}>
                  <FaGraduationCap />
                  {profile?.degree || 'Not provided'}
                </div>
              </div>
              <div className={styles.field}>
                <label>Current Average</label>
                <div className={styles.fieldValue}>
                  📊
                  {profile?.gpa ? `${profile.gpa}%` : 'Not provided'}
                </div>
              </div>
              <div className={styles.field}>
                <label>University</label>
                <div className={styles.fieldValue}>
                  <FaUniversity />
                  {profile?.university || 'Not provided'}
                </div>
              </div>
            </div>
          </section>

          {/* Courses & Study Interests Section */}
          <section className={styles.profileSection}>
            <h2>Courses & Study Interests</h2>
            <div className={styles.field}>
              <label>Current Courses</label>
              <div className={styles.modulesList}>
                {profile?.modules && profile.modules.length > 0 ? (
                  profile.modules.map((module: string, index: number) => (
                    <span key={index} className={styles.moduleTag}>
                      <FaBook /> {module}
                    </span>
                  ))
                ) : (
                  <span className={styles.noData}>No courses added</span>
                )}
              </div>
            </div>
            <div className={styles.field}>
              <label>Study Interests</label>
              <div className={styles.fieldValue}>
                {profile?.interest || 'Not provided'}
              </div>
            </div>
          </section>
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Edit Profile</h2>
                <button 
                  onClick={closeEditModal}
                  className={styles.closeButton}
                  disabled={loading}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.editForm}>
                {/* Personal Information */}
                <section className={styles.formSection}>
                  <h3>Personal Information</h3>
                  <div className={styles.fieldsGrid}>
                    <div className={styles.formField}>
                      <label htmlFor="full_name">Full Name *</label>
                      <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className={formErrors.full_name ? styles.errorInput : ''}
                      />
                      {formErrors.full_name && (
                        <span className={styles.errorText}>{formErrors.full_name}</span>
                      )}
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="email">Email Address *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={formErrors.email ? styles.errorInput : ''}
                      />
                      {formErrors.email && (
                        <span className={styles.errorText}>{formErrors.email}</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Academic Information */}
                <section className={styles.formSection}>
                  <h3>Academic Information</h3>
                  <div className={styles.fieldsGrid}>
                    <div className={styles.formField}>
                      <label htmlFor="year">Year of Study</label>
                      <select
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                      >
                        <option value="">-- Select Year --</option>
                        <option value="First Year">First Year</option>
                        <option value="Second Year">Second Year</option>
                        <option value="Third Year">Third Year</option>
                        <option value="Fourth Year">Fourth Year</option>
                        <option value="Graduate">Graduate</option>
                      </select>
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="degree">Degree *</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FaGraduationCap />
                        <select
                          id="degree"
                          name="degree"
                          value={formData.degree}
                          onChange={handleInputChange}
                          className={formErrors.degree ? styles.errorInput : ''}
                        >
                          <option value="">-- Select your degree --</option>
                          {degrees.map((deg) => (
                            <option key={deg} value={deg}>{deg}</option>
                          ))}
                        </select>
                      </div>
                      {formErrors.degree && (
                        <span className={styles.errorText}>{formErrors.degree}</span>
                      )}
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="gpa">Current Average (%)</label>
                      <input
                        type="number"
                        id="gpa"
                        name="gpa"
                        value={formData.gpa}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="university">University</label>
                      <input
                        type="text"
                        id="university"
                        name="university"
                        value={formData.university}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </section>

                {/* Modules Section */}
                <section className={styles.formSection}>
                  <h3>Courses & Interests</h3>
                  <div className={styles.formField}>
                    <label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <FaBook />
                        <span>Modules *</span>
                        <button
                          type="button"
                          onClick={addModule}
                          className={styles.addButton}
                        >
                          <FaPlus size={12} /> Add Module
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {selectedModules.map((selectedModule, index) => (
                          <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <select
                              value={selectedModule}
                              onChange={(e) => updateModule(index, e.target.value)}
                              style={{ flex: 1 }}
                            >
                              <option value="">-- Select a module --</option>
                              {getAvailableModules(index).map(mod => (
                                <option key={mod} value={mod}>{mod}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeModule(index)}
                              className={styles.removeButton}
                              title="Remove module"
                            >
                              <FaMinus size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </label>
                    {formErrors.modules && (
                      <span className={styles.errorText}>{formErrors.modules}</span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="interest">Study Interests</label>
                    <textarea
                      id="interest"
                      name="interest"
                      value={formData.interest}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Describe your study interests..."
                    />
                  </div>
                </section>

                <div className={styles.modalActions}>
                  <button 
                    type="button" 
                    onClick={closeEditModal}
                    className={styles.cancelButton}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className={styles.submitButton}
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}