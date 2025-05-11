import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
// Değiştirin:
// import { AppContext } from '../contexts/AppContext';

// Yeni import:
import { AppContext } from '../App';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import { coffeeItems, cookieItems, foodItems, coldDrinkItems } from '../data';

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