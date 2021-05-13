import React from 'react';
//import logo from './logo.svg';
import './App.css';
import {
  BrowserRouter as Router,
  Route
} from 'react-router-dom';
import DApp from './views/DApp';
import { Landing } from './views/Landing';

function App() {
  return (
    <Router>
      <Route exact path='/' component={Landing} />
      <Route path='/app' component={DApp} />
    </Router>
  );
}

export default App;
