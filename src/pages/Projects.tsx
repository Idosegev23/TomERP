import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Building, MapPin, Calendar, Users, CheckSquare2, ExternalLink, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { FileUploadModal } from '../components/files';
import toast from 'react-hot-toast';
import type { Database } from '../types/database.types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type Developer = Database['public']['Tables']['developers']['Row'];

interface ProjectFormData {
  name: string;
  description: string;
  developer_id: string;
  address: string;
  city: string;
  neighborhood: string;
  start_date: string;
  completion_date: string;
  marketing_start_date: string;
  project_status: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  task_type: 'technical' | 'marketing' | 'sales' | 'approval' | 'administrative';
  description: string;
  checklist_items: string[];
  applies_to: string;
  is_active: boolean;
}

const PROJECT_STATUSES = [
  { value: 'planning', label: 'בתכנון' },
  { value: 'construction', label: 'בבנייה' },
  { value: 'marketing', label: 'בשיווק' },
  { value: 'completed', label: 'הושלם' }
];

const Projects: React.FC = () => {
  const { t: _ } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedTaskTemplates, setSelectedTaskTemplates] = useState<string[]>([]);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [projectForFileUpload, setProjectForFileUpload] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    developer_id: '',
    address: '',
    city: '',
    neighborhood: '',
    start_date: '',
    completion_date: '',
    marketing_start_date: '',
    project_status: 'planning'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch projects with developer info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          developers:developer_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch all developers for the form
      const { data: developersData, error: developersError } = await supabase
        .from('developers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (developersError) throw developersError;

      // Fetch task templates for project creation
      const { data: taskTemplatesData, error: taskTemplatesError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .eq('applies_to', 'project')
        .order('task_type', { ascending: true });

      if (taskTemplatesError) throw taskTemplatesError;

      setProjects(projectsData || []);
      setDevelopers(developersData || []);
      setTaskTemplates(taskTemplatesData || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('שם הפרויקט הוא שדה חובה');
      return;
    }
    
    if (!formData.developer_id) {
      alert('בחירת יזם היא שדה חובה');
      return;
    }
    
    try {
      let projectId: string;

      // Prepare data with only valid fields
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        developer_id: formData.developer_id,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        neighborhood: formData.neighborhood.trim() || null,
        start_date: formData.start_date || null,
        completion_date: formData.completion_date || null,
        marketing_start_date: formData.marketing_start_date || null,
        project_status: formData.project_status || 'planning'
      };


      if (editingProject) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update(submitData)
          .eq('id', editingProject.id)
          .select()
          .single();

        if (error) {
          throw error;
        }
        projectId = editingProject.id;
      } else {
        // Create new project
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert([submitData])
          .select()
          .single();

        if (error) {
          throw error;
        }
        
        if (!newProject) {
          throw new Error('No project data returned');
        }
        
        projectId = newProject.id;

        // Create selected task templates for the new project
        if (selectedTaskTemplates.length > 0) {
          await createTasksFromTemplates(projectId, selectedTaskTemplates);
        }
      }

      // Reset form and refetch data
      resetForm();
      fetchData();
      alert(editingProject ? 'הפרויקט עודכן בהצלחה' : 'הפרויקט נוצר בהצלחה');
    } catch (error: any) {
      const errorMessage = error?.message || 'שגיאה לא ידועה';
      alert(`שגיאה בשמירת הנתונים: ${errorMessage}`);
    }
  };

  const createTasksFromTemplates = async (projectId: string, _templateIds: string[]) => {
    try {
      // This function will be implemented when the task creation functionality is ready
      // For now, we just log the action
    } catch (error) {
      // Don't throw here to avoid breaking the project creation flow
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      developer_id: project.developer_id || '',
      address: project.address || '',
      city: project.city || '',
      neighborhood: project.neighborhood || '',
      start_date: project.start_date || '',
      completion_date: project.completion_date || '',
      marketing_start_date: project.marketing_start_date || '',
      project_status: project.project_status || 'planning'
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק פרויקט זה?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchData();
      alert('הפרויקט נמחק בהצלחה');
    } catch (error) {
      alert('שגיאה במחיקת הפרויקט');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProject(null);
    setSelectedTaskTemplates([]);
    setFormData({
      name: '',
      description: '',
      developer_id: '',
      address: '',
      city: '',
      neighborhood: '',
      start_date: '',
      completion_date: '',
      marketing_start_date: '',
      project_status: 'planning'
    });
  };

  const openFileUploadModal = (project: Project) => {
    setProjectForFileUpload(project);
    setShowFileUploadModal(true);
  };

  const closeFileUploadModal = () => {
    setShowFileUploadModal(false);
    setProjectForFileUpload(null);
  };

  const handleFileUploadSuccess = () => {
    closeFileUploadModal();
    toast.success('הקבצים הועלו בהצלחה לפרויקט');
  };

  const handleTaskTemplateToggle = (templateId: string) => {
    setSelectedTaskTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { label: 'בתכנון', className: 'bg-gray-100 text-gray-800' },
      construction: { label: 'בבנייה', className: 'bg-orange-100 text-orange-800' },
      marketing: { label: 'בשיווק', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'הושלם', className: 'bg-green-100 text-green-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
          <div className="w-full">
      {/* Header */}
      <div className="bg-white shadow-sm px-2 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">פרויקטים</h1>
              <p className="text-gray-600">ניהול פרויקטים נדל"ן</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            פרויקט חדש
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white shadow-sm px-2 py-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingProject ? 'עריכת פרויקט' : 'פרויקט חדש'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Required Fields Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">שדות חובה:</span> שם הפרויקט ויזם הם שדות חובה ליצירת פרויקט חדש
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם הפרויקט <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הכנס שם פרויקט"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  יזם <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.developer_id}
                  onChange={(e) => setFormData({ ...formData, developer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">בחר יזם</option>
                  {developers.map((developer) => (
                    <option key={developer.id} value={developer.id}>
                      {developer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  עיר
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="עיר"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שכונה
                </label>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="שכונה"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                כתובת
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="כתובת מלאה"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תיאור
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="תיאור הפרויקט"
              />
            </div>

            {/* Dates and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך התחלה
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך סיום צפוי
                </label>
                <input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תחילת שיווק
                </label>
                <input
                  type="date"
                  value={formData.marketing_start_date}
                  onChange={(e) => setFormData({ ...formData, marketing_start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סטטוס פרויקט
                </label>
                <select
                  value={formData.project_status}
                  onChange={(e) => setFormData({ ...formData, project_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Task Templates Selection - Only for new projects */}
            {!editingProject && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare2 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">בחירת משימות ראשוניות</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskTemplates(taskTemplates.map(t => t.id))}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      בחר הכל
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTaskTemplates([])}
                      className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      בטל הכל
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  בחר את קבוצות המשימות שיתווספו אוטומטית לפרויקט החדש ({selectedTaskTemplates.length} מתוך {taskTemplates.length} נבחרו)
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {taskTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTaskTemplates.includes(template.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleTaskTemplateToggle(template.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm leading-5">{template.name}</h4>
                          {template.description && (
                            <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedTaskTemplates.includes(template.id)}
                          onChange={() => handleTaskTemplateToggle(template.id)}
                          className="h-4 w-4 text-blue-600 rounded mr-2 mt-0.5"
                        />
                      </div>
                      
                      <div className="max-h-32 overflow-y-auto">
                        <ul className="text-xs text-gray-600 space-y-1">
                          {template.checklist_items.slice(0, 4).map((subtask, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                              <span className="line-clamp-2">{subtask}</span>
                            </li>
                          ))}
                          {template.checklist_items.length > 4 && (
                            <li className="text-xs text-blue-600 font-medium">
                              +{template.checklist_items.length - 4} משימות נוספות...
                            </li>
                          )}
                        </ul>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          סה"כ {template.checklist_items.length} משימות
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingProject ? 'עדכן' : 'שמור'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">רשימת פרויקטים</h3>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין פרויקטים במערכת</h3>
            <p className="text-gray-500 mb-6">התחל על ידי יצירת פרויקט ראשון</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              יצירת פרויקט ראשון
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    פרויקט
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    יזם
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מיקום
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תאריכים
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <button
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer text-right"
                        >
                          {project.name}
                        </button>
                        {project.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(project as any).developers?.name || 'לא מוגדר'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {project.city && project.neighborhood ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.city}, {project.neighborhood}
                          </div>
                        ) : project.city ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.city}
                          </div>
                        ) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(project.project_status || 'planning')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {project.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">התחלה: {new Date(project.start_date).toLocaleDateString('he-IL')}</span>
                          </div>
                        )}
                        {project.marketing_start_date && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="text-xs">שיווק: {new Date(project.marketing_start_date).toLocaleDateString('he-IL')}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(project)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="עריכה"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openFileUploadModal(project)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="העלה קבצים"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="צפייה בפרטי הפרויקט"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="מחיקה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Upload Modal */}
      {showFileUploadModal && projectForFileUpload && (
        <FileUploadModal
          isOpen={showFileUploadModal}
          onClose={closeFileUploadModal}
          onUploadSuccess={handleFileUploadSuccess}
          initialEntityType="project"
          initialEntityId={projectForFileUpload.id}
        />
      )}
    </div>
  );
};

export default Projects; 