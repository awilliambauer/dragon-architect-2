/* FILENAME:    index.tsx
 * DESCRIPTION: 
 *      This file handles our app startup and sets the react interface to strict mode
 * DATE:    08/19/2021
 * AUTHOR:      Aaron Bauer
 */
import React from 'react';
import ReactDOM from 'react-dom';
import './css/index.css';
import './css/instructions.css';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
