// Q/A Management Frontend JavaScript
// Use localhost:3000 if opened as file://, otherwise use current origin
const API_BASE = (window && window.location && window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;
const token = localStorage.getItem('token');

// Check authentication
if (!token) {
  window.location.href = '/login.html';
}

// API Headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// DOM Elements
const qaForm = document.getElementById('qaForm');
const qaList = document.getElementById('qaList');
const editModalTemplate = document.getElementById('editModalTemplate');

// Event Listeners
qaForm.addEventListener('submit', handleCreateQA);
document.addEventListener('DOMContentLoaded', loadQAEntries);

// Create Q/A Entry
async function handleCreateQA(e) {
  e.preventDefault();
  
  const question = document.getElementById('question').value;
  const answer = document.getElementById('answer').value;
  
  try {
    const response = await fetch(`${API_BASE}/api/qa`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, answer })
    });
    
    if (!response.ok) throw new Error('Failed to create Q/A entry');
    
    const qa = await response.json();
    qaForm.reset();
    await loadQAEntries(); // Refresh list
    showNotification('Q/A entry created successfully', 'success');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Load Q/A Entries
async function loadQAEntries() {
  try {
    const response = await fetch(`${API_BASE}/api/qa`, { headers });
    if (!response.ok) throw new Error('Failed to fetch Q/A entries');
    
    const entries = await response.json();
    renderQAList(entries);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Render Q/A List
function renderQAList(entries) {
  qaList.innerHTML = entries.map(entry => `
    <div class="qa-entry" data-id="${entry.id}">
      <div class="qa-content">
        <h3>${escapeHtml(entry.question)}</h3>
        <p>${escapeHtml(entry.answer)}</p>
        <div class="qa-meta">
          <small>Created: ${new Date(entry.created_at).toLocaleString()}</small>
          ${entry.updated_at ? `<small>Updated: ${new Date(entry.updated_at).toLocaleString()}</small>` : ''}
        </div>
      </div>
      <div class="qa-actions">
        <button onclick="editQA(${entry.id})" class="btn secondary">Edit</button>
        <button onclick="deleteQA(${entry.id})" class="btn danger">Delete</button>
      </div>
    </div>
  `).join('');
}

// Edit Q/A Entry
async function editQA(id) {
  try {
    const response = await fetch(`${API_BASE}/api/qa/${id}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch Q/A entry');
    
    const entry = await response.json();
    showEditModal(entry);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Show Edit Modal
function showEditModal(entry) {
  const modal = editModalTemplate.content.cloneNode(true);
  document.body.appendChild(modal);
  
  const editForm = document.getElementById('editForm');
  const questionInput = document.getElementById('editQuestion');
  const answerInput = document.getElementById('editAnswer');
  
  questionInput.value = entry.question;
  answerInput.value = entry.answer;
  
  editForm.onsubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE}/api/qa/${entry.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          question: questionInput.value,
          answer: answerInput.value
        })
      });
      
      if (!response.ok) throw new Error('Failed to update Q/A entry');
      
      await loadQAEntries();
      closeModal();
      showNotification('Q/A entry updated successfully', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };
}

// Delete Q/A Entry
async function deleteQA(id) {
  if (!confirm('Are you sure you want to delete this Q/A entry?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/qa/${id}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) throw new Error('Failed to delete Q/A entry');
    
    await loadQAEntries();
    showNotification('Q/A entry deleted successfully', 'success');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Close Modal
function closeModal() {
  const modal = document.querySelector('.modal');
  if (modal) modal.remove();
}

// Show Notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}