/**
 * UniShared Application JavaScript
 * Provides common functionality for the entire application
 */

// Global settings
const APP = {
  // Application initialization
  init: function() {
    // Initialize all components
    this.setupLoadingIndicators();
    this.setupFormValidation();
    this.setupAlerts();
    this.setupResponsiveTables();
    this.setupStarRating();
    this.setupErrorHandling();
    this.initTooltips();
    
    // Log initialization
    console.log('UniShared app initialized');
  },
  
  // Loading indicator management
  setupLoadingIndicators: function() {
    const spinner = document.getElementById('loading-spinner');
    if (!spinner) return;
    
    // Show spinner on form submission
    const forms = document.querySelectorAll('form:not(.no-loading)');
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        // Validate form first
        if (!form.checkValidity()) {
          e.preventDefault();
          return;
        }
        APP.showSpinner();
      });
    });
    
    // Show spinner on links with data-loading attribute
    const loadingLinks = document.querySelectorAll('a[data-loading="true"]');
    loadingLinks.forEach(link => {
      link.addEventListener('click', function() {
        APP.showSpinner();
      });
    });
    
    // For AJAX requests
    document.addEventListener('ajax-start', function() {
      APP.showSpinner();
    });
    
    document.addEventListener('ajax-complete', function() {
      APP.hideSpinner();
    });
    
    // Hide spinner when page is fully loaded
    window.addEventListener('load', function() {
      APP.hideSpinner();
    });

    // Add keyboard accessibility for spinner
    document.addEventListener('keydown', function(e) {
      // Allow ESC key to cancel loading if it's been showing for more than 5 seconds
      if (e.key === 'Escape' && spinner.style.display === 'flex') {
        const loadingTime = Date.now() - APP.spinnerStartTime;
        if (loadingTime > 5000) { // 5 seconds
          APP.hideSpinner();
          APP.showError('Operation was cancelled by the user.');
        }
      }
    });
  },
  
  // Track when spinner was shown
  spinnerStartTime: 0,
  
  // Show spinner overlay
  showSpinner: function() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.style.display = 'flex';
      this.spinnerStartTime = Date.now();
    }
  },
  
  // Hide spinner overlay
  hideSpinner: function() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      // Add a fade-out effect
      spinner.style.opacity = '0';
      setTimeout(() => {
        spinner.style.display = 'none';
        spinner.style.opacity = '1';
      }, 300);
    }
  },
  
  // Enhanced form validation
  setupFormValidation: function() {
    const forms = document.querySelectorAll('form.needs-validation');
    
    Array.from(forms).forEach(form => {
      // Add validation classes on input events
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', function() {
          if (this.checkValidity()) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
          } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
          }
        });
      });
      
      // Handle form submission
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
          
          // Highlight all invalid fields
          const invalidInputs = form.querySelectorAll(':invalid');
          invalidInputs.forEach(input => {
            input.classList.add('is-invalid');
            
            // Create error message if doesn't exist
            let feedback = input.nextElementSibling;
            if (!feedback || !feedback.classList.contains('invalid-feedback')) {
              feedback = document.createElement('div');
              feedback.className = 'invalid-feedback';
              input.parentNode.insertBefore(feedback, input.nextSibling);
            }
            
            feedback.textContent = input.validationMessage;
          });
          
          // Scroll to first invalid field
          if (invalidInputs.length > 0) {
            invalidInputs[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            invalidInputs[0].focus();
          }
          
          APP.showError('Please correct the highlighted fields before submitting.');
        }
        
        form.classList.add('was-validated');
      }, false);
    });
  },
  
  // Auto-dismiss alerts
  setupAlerts: function() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    
    alerts.forEach(alert => {
      // Add close button if not present
      if (!alert.querySelector('.close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
          this.dismissAlert(alert);
        });
        alert.appendChild(closeBtn);
        alert.classList.add('alert-dismissible');
      }
      
      // Auto-dismiss after delay
      setTimeout(() => {
        this.dismissAlert(alert);
      }, 5000);
    });
  },
  
  // Dismiss alert with animation
  dismissAlert: function(alert) {
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 500);
  },
  
  // Show error message
  showError: function(message) {
    const container = document.querySelector('.container');
    if (!container) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible';
    alertDiv.innerHTML = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      this.dismissAlert(alertDiv);
    });
    
    alertDiv.appendChild(closeBtn);
    
    // Insert at the top of the container
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss
    setTimeout(() => {
      this.dismissAlert(alertDiv);
    }, 5000);
    
    return alertDiv;
  },
  
  // Show success message
  showSuccess: function(message) {
    const container = document.querySelector('.container');
    if (!container) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible';
    alertDiv.innerHTML = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      this.dismissAlert(alertDiv);
    });
    
    alertDiv.appendChild(closeBtn);
    
    // Insert at the top of the container
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss
    setTimeout(() => {
      this.dismissAlert(alertDiv);
    }, 5000);
    
    return alertDiv;
  },
  
  // Make tables responsive
  setupResponsiveTables: function() {
    const tables = document.querySelectorAll('.table');
    
    tables.forEach(table => {
      // Add responsive wrapper if needed
      if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive table-responsive-sm';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
      
      // Add data attributes for mobile responsive view
      const headerCells = table.querySelectorAll('thead th');
      const headerLabels = Array.from(headerCells).map(cell => cell.textContent.trim());
      
      const bodyCells = table.querySelectorAll('tbody td');
      bodyCells.forEach((cell, index) => {
        const labelIndex = index % headerLabels.length;
        cell.setAttribute('data-label', headerLabels[labelIndex]);
      });
    });
  },
  
  // Initialize Star Rating
  setupStarRating: function() {
    const starRatings = document.querySelectorAll('.star-rating');
    
    starRatings.forEach(container => {
      const input = container.querySelector('input[type="hidden"]');
      const value = input ? input.value : 0;
      
      // Create the star elements if not already present
      if (!container.querySelector('label')) {
        for (let i = 5; i >= 1; i--) {
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = input ? input.name + '_stars' : 'rating';
          radio.value = i;
          radio.id = (input ? input.name : 'rating') + '_' + i;
          if (i == value) radio.checked = true;
          
          const label = document.createElement('label');
          label.htmlFor = radio.id;
          label.title = this.getStarLabel(i);
          
          radio.addEventListener('change', function() {
            if (input) input.value = this.value;
            
            // Highlight selected stars
            const labels = container.querySelectorAll('label');
            labels.forEach((lbl, idx) => {
              if (idx < (5 - i)) {
                lbl.classList.add('active');
              } else {
                lbl.classList.remove('active');
              }
            });
          });
          
          container.appendChild(radio);
          container.appendChild(label);
        }
      }
    });
  },
  
  // Get label for star rating
  getStarLabel: function(stars) {
    switch(stars) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return '';
    }
  },
  
  // Global error handling
  setupErrorHandling: function() {
    // Handle AJAX errors globally
    window.addEventListener('error', function(e) {
      console.error('Global error:', e.error || e.message);
      if (!e.error || e.error.isHandled) return;
      
      APP.showError('An unexpected error occurred. Please try again later.');
      APP.hideSpinner();
      
      // Mark as handled to prevent multiple alerts
      if (e.error) e.error.isHandled = true;
    });
    
    // Add custom error handling for fetch
    const originalFetch = window.fetch;
    window.fetch = function() {
      return originalFetch.apply(this, arguments)
        .catch(error => {
          console.error('Fetch error:', error);
          APP.showError('Network error. Please check your connection and try again.');
          APP.hideSpinner();
          error.isHandled = true;
          throw error;
        });
    };
  },
  
  // Initialize Bootstrap tooltips
  initTooltips: function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
      tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }
  },
  
  // AJAX helper function with better error handling
  fetchData: function(url, options = {}) {
    // Trigger loading start
    document.dispatchEvent(new Event('ajax-start'));
    
    // Set default options
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    };
    
    const fetchOptions = {...defaultOptions, ...options};
    
    return fetch(url, fetchOptions)
      .then(response => {
        // Check for HTTP errors
        if (!response.ok) {
          let errorMessage = 'Server Error: ' + response.status;
          
          // Try to get more detailed error message
          return response.text().then(text => {
            try {
              const json = JSON.parse(text);
              if (json.error || json.message) {
                errorMessage = json.error || json.message;
              }
            } catch (e) {
              // If text is not JSON, use it directly if it's not too long
              if (text && text.length < 100) {
                errorMessage = text;
              }
            }
            
            // Create a custom error
            const error = new Error(errorMessage);
            error.status = response.status;
            error.response = response;
            throw error;
          });
        }
        
        // Parse response
        if (response.headers.get('Content-Type')?.includes('application/json')) {
          return response.json();
        }
        return response.text();
      })
      .then(data => {
        // Success - hide spinner and return data
        document.dispatchEvent(new Event('ajax-complete'));
        return data;
      })
      .catch(error => {
        // Handle errors
        document.dispatchEvent(new Event('ajax-complete'));
        console.error('Fetch error:', error);
        
        // Show error message to user if not already handled
        if (!error.isHandled) {
          APP.showError(error.message || 'An error occurred while fetching data.');
          error.isHandled = true;
        }
        
        throw error;
      });
  },
  
  // Format dates consistently
  formatDate: function(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  // Format currency consistently
  formatCurrency: function(amount) {
    return '£' + parseFloat(amount).toFixed(2);
  }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  APP.init();
}); 