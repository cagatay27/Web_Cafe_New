import React, { useContext } from 'react';
import { IconButton } from '@mui/material';
import { ShoppingCart, Favorite } from '@mui/icons-material';
import { AppContext } from '../contexts/AppContext';

function ProductCard({ item, addToCart, addToFavorites }) {
  const { user } = useContext(AppContext);
  
  const handleAddToCart = () => {
    if (!user) {
      alert('Lütfen önce giriş yapın');
      return;
    }
    addToCart(item);
  };
  
  const handleAddToFavorites = () => {
    if (!user) {
      alert('Lütfen önce giriş yapın');
      return;
    }
    addToFavorites(item);
  };
  
  return (
    <div className="product-card">
      <img src={item.image} alt={item.name} className="product-image" />
      <h3>{item.name}</h3>
      <p>{item.price} TL</p>
      <div className="product-actions">
        <IconButton className="add-to-cart" onClick={handleAddToCart}>
          <ShoppingCart />
        </IconButton>
        <IconButton className="add-to-favorites" onClick={handleAddToFavorites}>
          <Favorite />
        </IconButton>
      </div>
    </div>
  );
}

export default ProductCard;