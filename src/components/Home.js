import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Favorite } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { AppContext } from '../App'; // Make sure it's importing from App.js, not from contexts folder
import { coffeeItems, cookieItems, foodItems, coldDrinkItems } from '../data';

function SearchBar({ searchTerm, setSearchTerm }) {
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="search-container">
      <input 
        type="text" 
        placeholder="Ürün ara..." 
        className="search-input" 
        value={searchTerm}
        onChange={handleSearch}
      />
      <Search className="search-icon" />
    </div>
  );
}

function CategoryCard({ title, items, addToCart, addToFavorites }) {
  return (
    <div className="category-card">
      <h2>{title}</h2>
      <div className="product-grid">
        {items.map((item, index) => (
          <ProductCard key={index} item={item} addToCart={addToCart} addToFavorites={addToFavorites} />
        ))}
      </div>
    </div>
  );
}

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

function Home() {
  const navigate = useNavigate();
  const { addToCart, addToFavorites } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Combine all items for searching
  const allItems = [...coffeeItems, ...cookieItems, ...foodItems, ...coldDrinkItems];
  
  // Filter items based on search term
  const filteredItems = searchTerm 
    ? allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;
  
  return (
    <div className="home-container">
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      {searchTerm && filteredItems.length > 0 ? (
        <div className="search-results">
          <h2>Arama Sonuçları</h2>
          <div className="product-grid">
            {filteredItems.map((item, index) => (
              <ProductCard key={index} item={item} addToCart={addToCart} addToFavorites={addToFavorites} />
            ))}
          </div>
        </div>
      ) : searchTerm ? (
        <div className="no-results">
          <h2>Arama sonucu bulunamadı</h2>
          <p>"{searchTerm}" için sonuç bulunamadı.</p>
        </div>
      ) : (
        <div className="category-grid">
          <CategoryCard title="Kahve" items={coffeeItems} addToCart={addToCart} addToFavorites={addToFavorites} />
          <CategoryCard title="Kurabiye" items={cookieItems} addToCart={addToCart} addToFavorites={addToFavorites} />
          <CategoryCard title="Yemekler" items={foodItems} addToCart={addToCart} addToFavorites={addToFavorites} />
          <CategoryCard title="Soğuk İçecekler" items={coldDrinkItems} addToCart={addToCart} addToFavorites={addToFavorites} />
        </div>
      )}
    </div>
  );
}

export default Home;
export { SearchBar, CategoryCard, ProductCard };