import React from 'react';
import ProductCard from './ProductCard';

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

export default CategoryCard;