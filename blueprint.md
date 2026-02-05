# Project Blueprint: Interactive Idea Canvas

## 1. Overview

This project aims to create a visually engaging and interactive web application. Users can type a direction (up, down, left, or right) into a text field. Upon pressing Enter, a visual element, representing an "idea," will animate from the center of the screen outwards in the specified direction. New ideas are generated with each submission, creating a continuous and dynamic visual experience.

## 2. Core Features & Design

### a. Visual Design & Aesthetics
- **Theme:** A modern, dark theme to make the visual elements pop.
- **Background:** A subtle, textured dark background to add depth and a premium feel.
- **Idea Elements:** The "ideas" will be represented by soft, glowing circles with a vibrant color gradient. They will have a multi-layered drop shadow to create a sense of depth and make them appear "lifted" off the page.
- **Input Field:** A centrally located, stylish, pill-shaped input field that glows on focus, guiding the user's attention.
- **Responsiveness:** The application will be fully responsive and work on all screen sizes.

### b. Core Functionality
- **User Input:** A single text input field for users to enter directional commands.
- **Element Generation:** On "Enter," a new "idea" element is dynamically created and added to the page.
- **Animation:** The new element will animate based on the user's input.
    - `up`: Moves from the center to the top of the screen.
    - `down`: Moves from the center to the bottom.
    - `left`: Moves from the center to the left.
    - `right`: Moves from the center to the right.
- **Repetition:** Users can trigger this action repeatedly, layering multiple animations.
- **DOM Management:** To ensure performance, the animated elements will be removed from the DOM after their animation completes.

### c. Technical Implementation
- **`index.html`:** Will contain the basic structure, including the input field and a container (`div#canvas`) for the idea elements.
- **`style.css`:** Will define the overall aesthetic, styles for the input field, and the keyframe animations for the movement of the ideas.
- **`main.js`:** Will handle the core logic:
    - Listen for `keydown` events on the input field.
    - Create a new `div` for the idea on "Enter."
    - Assign the correct CSS class to the new element to trigger the corresponding animation.
    - Append the element to the canvas.
    - Use `setTimeout` to remove the element after the animation finishes.
