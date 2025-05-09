import React, { useContext } from 'react';
import { IconButton } from '@mui/material';
import { DeleteOutline, ShoppingCart } from '@mui/icons-material';
import { AppContext } from '../App'; // Make sure it's importing from App.js

function Favorites() {
  const { favoriteItems, removeFromFavorites, addToCart } = useContext(AppContext);
  
  return (
    <div className="favorites-page">
      <h2>Favorilerim</h2>
      {favoriteItems.length === 0 ? (
        <p>Favorilerinizde ürün bulunmamaktadır.</p>
      ) : (
        <div className="favorites-items">
          {favoriteItems.map((item, index) => (
            <div key={index} className="favorite-item">
              <img src={item.image} alt={item.name} className="favorite-image" />
              <div className="favorite-item-info">
                <h3>{item.name}</h3>
                <p>{item.price} TL</p>
              </div>
              <IconButton 
                className="remove-from-favorites" 
                onClick={() => removeFromFavorites(item.id)}
                color="error"
              >
                <DeleteOutline />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;