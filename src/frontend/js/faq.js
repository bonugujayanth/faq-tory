const API_BASE = (window && window.location && window.location.origin) ? window.location.origin : '';

// FAQ Management Functions
class FAQManager {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Get all FAQs
  async getFAQs(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        queryParams.append(key, filters[key]);
      }
    });
    
    const endpoint = `/api/faq${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await this.makeRequest(endpoint);
  }

  // Get FAQ by ID
  async getFAQ(id) {
    return await this.makeRequest(`/api/faq/${id}`);
  }

  // Create new FAQ
  async createFAQ(faqData) {
    return await this.makeRequest('/api/faq', {
      method: 'POST',
      body: JSON.stringify(faqData)
    });
  }

  // Update FAQ
  async updateFAQ(id, updateData) {
    return await this.makeRequest(`/api/faq/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  // Delete FAQ
  async deleteFAQ(id) {
    return await this.makeRequest(`/api/faq/${id}`, {
      method: 'DELETE'
    });
  }

  // Publish FAQ
  async publishFAQ(id) {
    return await this.makeRequest(`/api/faq/${id}/publish`, {
      method: 'POST'
    });
  }

  // Archive FAQ
  async archiveFAQ(id) {
    return await this.makeRequest(`/api/faq/${id}/archive`, {
      method: 'POST'
    });
  }

  // Search FAQs
  async searchFAQs(query, options = {}) {
    const queryParams = new URLSearchParams({ q: query });
    Object.keys(options).forEach(key => {
      if (options[key] !== undefined && options[key] !== null) {
        queryParams.append(key, options[key]);
      }
    });
    
    return await this.makeRequest(`/api/faq/search?${queryParams.toString()}`);
  }

  // Get FAQ statistics
  async getStats() {
    return await this.makeRequest('/api/faq/stats/overview');
  }
}

// Category Management Functions
class CategoryManager {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Get all categories
  async getCategories() {
    return await this.makeRequest('/api/categories');
  }

  // Get category by ID
  async getCategory(id) {
    return await this.makeRequest(`/api/categories/${id}`);
  }

  // Create new category
  async createCategory(categoryData) {
    return await this.makeRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  }

  // Update category
  async updateCategory(id, updateData) {
    return await this.makeRequest(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  // Delete category
  async deleteCategory(id) {
    return await this.makeRequest(`/api/categories/${id}`, {
      method: 'DELETE'
    });
  }

  // Get category statistics
  async getCategoryStats(id) {
    return await this.makeRequest(`/api/categories/${id}/stats`);
  }
}

// Admin Management Functions
class AdminManager {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Get all users
  async getUsers(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        queryParams.append(key, filters[key]);
      }
    });
    
    const endpoint = `/api/admin/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await this.makeRequest(endpoint);
  }

  // Get user by ID
  async getUser(id) {
    return await this.makeRequest(`/api/admin/users/${id}`);
  }

  // Create new user
  async createUser(userData) {
    return await this.makeRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Update user role
  async updateUserRole(id, role) {
    return await this.makeRequest(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  }

  // Delete user
  async deleteUser(id) {
    return await this.makeRequest(`/api/admin/users/${id}`, {
      method: 'DELETE'
    });
  }

  // Get system statistics
  async getSystemStats() {
    return await this.makeRequest('/api/admin/stats');
  }

  // Get audit log
  async getAuditLog(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        queryParams.append(key, filters[key]);
      }
    });
    
    const endpoint = `/api/admin/audit${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await this.makeRequest(endpoint);
  }
}

// Utility Functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function showNotification(message, type = 'info') {
  // Simple notification system
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  if (type === 'success') {
    notification.style.backgroundColor = '#16a34a';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#dc2626';
  } else {
    notification.style.backgroundColor = '#2563eb';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showModal(title, content, buttons = []) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  modalContent.innerHTML = `
    <h2 style="margin-top: 0;">${title}</h2>
    <div class="modal-body">${content}</div>
    <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
      ${buttons.map(btn => `<button class="nav-button ${btn.class || ''}" onclick="${btn.onclick}">${btn.text}</button>`).join('')}
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  return modal;
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = { FAQManager, CategoryManager, AdminManager, formatDate, truncateText, showNotification, showModal };
}

// Global instances for easy access
window.faqManager = new FAQManager();
window.categoryManager = new CategoryManager();
window.adminManager = new AdminManager();
