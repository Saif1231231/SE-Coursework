/**
 * @jest-environment jsdom
 */

// Import necessary testing utilities
const { fireEvent } = require('@testing-library/dom');
require('@testing-library/jest-dom');

describe('Form Validation', () => {
  // Set up the DOM before each test
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="container">
        <form id="rideForm" class="needs-validation" novalidate>
          <div class="mb-3">
            <label for="pickup" class="form-label">Pickup Location</label>
            <input type="text" class="form-control" id="pickup" name="pickup" required>
            <div class="invalid-feedback">
              Please enter a pickup location.
            </div>
          </div>
          <div class="mb-3">
            <label for="destination" class="form-label">Destination</label>
            <input type="text" class="form-control" id="destination" name="destination" required>
            <div class="invalid-feedback">
              Please enter a destination.
            </div>
          </div>
          <div class="mb-3">
            <label for="date" class="form-label">Date</label>
            <input type="date" class="form-control" id="date" name="date" required>
            <div class="invalid-feedback">
              Please select a date.
            </div>
          </div>
          <div class="mb-3">
            <label for="time" class="form-label">Time</label>
            <input type="time" class="form-control" id="time" name="time" required>
            <div class="invalid-feedback">
              Please select a time.
            </div>
          </div>
          <div class="mb-3">
            <label for="seats" class="form-label">Number of Seats</label>
            <input type="number" class="form-control" id="seats" name="seats" min="1" max="4" required>
            <div class="invalid-feedback">
              Please select between 1 and 4 seats.
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Submit</button>
        </form>
        <div id="formResult"></div>
      </div>
    `;

    // Initialize form validation
    const form = document.getElementById('rideForm');
    
    form.addEventListener('submit', function(event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        event.preventDefault(); // For testing purposes
        document.getElementById('formResult').textContent = 'Form submitted successfully';
      }
      
      form.classList.add('was-validated');
    });
  });

  test('should prevent submission when required fields are empty', () => {
    const form = document.getElementById('rideForm');
    const formResult = document.getElementById('formResult');
    
    // Submit the form without filling any fields
    fireEvent.submit(form);
    
    // Form should have validation class
    expect(form).toHaveClass('was-validated');
    
    // Form result should be empty (submission prevented)
    expect(formResult.textContent).toBe('');
  });

  test('should show validation messages for empty required fields', () => {
    const form = document.getElementById('rideForm');
    
    // Submit the form without filling any fields
    fireEvent.submit(form);
    
    // Check that inputs are marked as invalid
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    const dateInput = document.getElementById('date');
    
    expect(pickupInput.validity.valid).toBe(false);
    expect(destinationInput.validity.valid).toBe(false);
    expect(dateInput.validity.valid).toBe(false);
  });

  test('should allow submission when all required fields are filled', () => {
    const form = document.getElementById('rideForm');
    const formResult = document.getElementById('formResult');
    
    // Fill out all required fields
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const seatsInput = document.getElementById('seats');
    
    fireEvent.change(pickupInput, { target: { value: 'University' } });
    fireEvent.change(destinationInput, { target: { value: 'Downtown' } });
    fireEvent.change(dateInput, { target: { value: '2023-05-15' } });
    fireEvent.change(timeInput, { target: { value: '14:30' } });
    fireEvent.change(seatsInput, { target: { value: '2' } });
    
    // Submit the form
    fireEvent.submit(form);
    
    // Form should have validation class
    expect(form).toHaveClass('was-validated');
    
    // Form result should indicate successful submission
    expect(formResult.textContent).toBe('Form submitted successfully');
  });

  test('should validate number inputs within min/max range', () => {
    const form = document.getElementById('rideForm');
    const seatsInput = document.getElementById('seats');
    
    // Fill out all fields except seats
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    
    fireEvent.change(pickupInput, { target: { value: 'University' } });
    fireEvent.change(destinationInput, { target: { value: 'Downtown' } });
    fireEvent.change(dateInput, { target: { value: '2023-05-15' } });
    fireEvent.change(timeInput, { target: { value: '14:30' } });
    
    // Set seats value outside valid range
    fireEvent.change(seatsInput, { target: { value: '6' } });
    
    // Submit the form
    fireEvent.submit(form);
    
    // Seats should be invalid
    expect(seatsInput.validity.valid).toBe(false);
    
    // Form result should be empty (submission prevented)
    expect(document.getElementById('formResult').textContent).toBe('');
    
    // Now set a valid value
    fireEvent.change(seatsInput, { target: { value: '3' } });
    
    // Submit the form again
    fireEvent.submit(form);
    
    // Seats should now be valid
    expect(seatsInput.validity.valid).toBe(true);
    
    // Form result should indicate successful submission
    expect(document.getElementById('formResult').textContent).toBe('Form submitted successfully');
  });
}); 