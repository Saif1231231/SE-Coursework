/**
 * @jest-environment jsdom
 */

// Import necessary testing utilities
const { fireEvent } = require('@testing-library/dom');
require('@testing-library/jest-dom');

describe('Star Rating Component', () => {
  // Set up the DOM before each test
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="star-rating" data-max="5">
        <div class="stars">
          <span class="star" data-value="1"><i class="bi bi-star"></i></span>
          <span class="star" data-value="2"><i class="bi bi-star"></i></span>
          <span class="star" data-value="3"><i class="bi bi-star"></i></span>
          <span class="star" data-value="4"><i class="bi bi-star"></i></span>
          <span class="star" data-value="5"><i class="bi bi-star"></i></span>
        </div>
        <input type="hidden" name="rating" id="rating-input" value="0">
        <div class="rating-value">0 / 5</div>
      </div>
    `;

    // Initialize the star rating functionality
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
      star.addEventListener('click', function() {
        const value = parseInt(this.dataset.value);
        document.getElementById('rating-input').value = value;
        document.querySelector('.rating-value').textContent = `${value} / 5`;
        
        stars.forEach(s => {
          const starValue = parseInt(s.dataset.value);
          const icon = s.querySelector('i');
          if (starValue <= value) {
            icon.classList.remove('bi-star');
            icon.classList.add('bi-star-fill');
          } else {
            icon.classList.remove('bi-star-fill');
            icon.classList.add('bi-star');
          }
        });
      });
    });
  });

  test('should initialize with 0 rating', () => {
    expect(document.getElementById('rating-input').value).toBe('0');
    expect(document.querySelector('.rating-value').textContent).toBe('0 / 5');
    
    const stars = document.querySelectorAll('.star i');
    stars.forEach(star => {
      expect(star).toHaveClass('bi-star');
      expect(star).not.toHaveClass('bi-star-fill');
    });
  });

  test('should update rating when star is clicked', () => {
    const thirdStar = document.querySelector('[data-value="3"]');
    fireEvent.click(thirdStar);
    
    expect(document.getElementById('rating-input').value).toBe('3');
    expect(document.querySelector('.rating-value').textContent).toBe('3 / 5');
    
    const stars = document.querySelectorAll('.star i');
    
    // First 3 stars should be filled
    for (let i = 0; i < 3; i++) {
      expect(stars[i]).toHaveClass('bi-star-fill');
      expect(stars[i]).not.toHaveClass('bi-star');
    }
    
    // Last 2 stars should be empty
    for (let i = 3; i < 5; i++) {
      expect(stars[i]).toHaveClass('bi-star');
      expect(stars[i]).not.toHaveClass('bi-star-fill');
    }
  });

  test('should update rating when changing selection', () => {
    // First click 5th star
    const fifthStar = document.querySelector('[data-value="5"]');
    fireEvent.click(fifthStar);
    
    expect(document.getElementById('rating-input').value).toBe('5');
    
    // Then click 2nd star
    const secondStar = document.querySelector('[data-value="2"]');
    fireEvent.click(secondStar);
    
    expect(document.getElementById('rating-input').value).toBe('2');
    expect(document.querySelector('.rating-value').textContent).toBe('2 / 5');
    
    const stars = document.querySelectorAll('.star i');
    
    // First 2 stars should be filled
    for (let i = 0; i < 2; i++) {
      expect(stars[i]).toHaveClass('bi-star-fill');
    }
    
    // Last 3 stars should be empty
    for (let i = 2; i < 5; i++) {
      expect(stars[i]).toHaveClass('bi-star');
    }
  });
}); 