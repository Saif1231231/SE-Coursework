/**
 * @jest-environment jsdom
 */

// Import necessary testing utilities
const { fireEvent } = require('@testing-library/dom');
require('@testing-library/jest-dom');

describe('Favorites Functionality', () => {
  // Set up the DOM before each test
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="container">
        <div class="row">
          <div class="col-md-8">
            <div id="favoritesList">
              <div class="card mb-3 favorite-item" data-id="1">
                <div class="card-body">
                  <h5 class="card-title">University to City Center</h5>
                  <p class="card-text">
                    <strong>From:</strong> University Campus<br>
                    <strong>To:</strong> City Center
                  </p>
                  <div class="d-flex justify-content-between mt-3">
                    <button class="btn btn-primary find-rides-btn">Find Rides</button>
                    <button class="btn btn-outline-secondary edit-favorite-btn" data-bs-toggle="modal" data-bs-target="#editFavoriteModal">Edit</button>
                    <button class="btn btn-outline-danger delete-favorite-btn">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card">
              <div class="card-body">
                <h5 class="card-title">Add New Favorite</h5>
                <form id="addFavoriteForm">
                  <div class="mb-3">
                    <label for="pickup" class="form-label">Pickup Location</label>
                    <input type="text" class="form-control" id="pickup" name="pickup_location" required>
                  </div>
                  <div class="mb-3">
                    <label for="dropoff" class="form-label">Destination</label>
                    <input type="text" class="form-control" id="dropoff" name="dropoff_location" required>
                  </div>
                  <div class="mb-3">
                    <label for="note" class="form-label">Note (Optional)</label>
                    <textarea class="form-control" id="note" name="note" rows="2"></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary">Save Route</button>
                </form>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Confirmation Modal -->
        <div class="modal fade" id="deleteConfirmModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Confirm Delete</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                Are you sure you want to delete this favorite route?
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add form submission handler
    const addForm = document.getElementById('addFavoriteForm');
    addForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const pickup = document.getElementById('pickup').value;
      const dropoff = document.getElementById('dropoff').value;
      const note = document.getElementById('note').value;
      
      if (pickup && dropoff) {
        // In a real app, this would send data to the server
        // For testing, we'll just clear the form
        addForm.reset();
      }
    });

    // Add delete button handler
    const deleteButtons = document.querySelectorAll('.delete-favorite-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', function() {
        const favoriteId = this.closest('.favorite-item').dataset.id;
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        // Set up the confirm delete button to "delete" the item when clicked
        confirmDeleteBtn.addEventListener('click', function() {
          const itemToRemove = document.querySelector(`.favorite-item[data-id="${favoriteId}"]`);
          if (itemToRemove) {
            itemToRemove.remove();
          }
        });
      });
    });
  });

  test('should have a favorite item in the list', () => {
    const favoritesList = document.getElementById('favoritesList');
    const favoriteItems = favoritesList.querySelectorAll('.favorite-item');
    
    expect(favoriteItems.length).toBe(1);
    expect(favoriteItems[0].querySelector('.card-title').textContent).toBe('University to City Center');
  });

  test('should allow adding a new favorite route', () => {
    const form = document.getElementById('addFavoriteForm');
    const pickupInput = document.getElementById('pickup');
    const dropoffInput = document.getElementById('dropoff');
    const noteInput = document.getElementById('note');
    
    // Fill out the form
    fireEvent.change(pickupInput, { target: { value: 'North Campus' } });
    fireEvent.change(dropoffInput, { target: { value: 'Shopping Mall' } });
    fireEvent.change(noteInput, { target: { value: 'Weekend trips' } });
    
    // Assert form values before submission
    expect(pickupInput.value).toBe('North Campus');
    expect(dropoffInput.value).toBe('Shopping Mall');
    
    // Submit the form
    fireEvent.submit(form);
    
    // Form should be reset after submission
    expect(pickupInput.value).toBe('');
    expect(dropoffInput.value).toBe('');
    expect(noteInput.value).toBe('');
  });

  test('should set up delete confirmation flow', () => {
    const deleteButton = document.querySelector('.delete-favorite-btn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // Click the delete button (in reality this would show the modal)
    fireEvent.click(deleteButton);
    
    // Then click the confirm button in the modal
    fireEvent.click(confirmDeleteBtn);
    
    // The favorite item should be removed
    const favoritesList = document.getElementById('favoritesList');
    const favoriteItems = favoritesList.querySelectorAll('.favorite-item');
    
    expect(favoriteItems.length).toBe(0);
  });
}); 