import React, { useState, useContext } from 'react';
import { Button, IconButton } from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import { AppContext } from '../App';
import { v4 as uuidv4 } from 'uuid';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

function Cart() {
  const { cartItems, removeFromCart, user, setCartItems } = useContext(AppContext);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Calculate total price considering quantity
  const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  const handleCheckout = async () => {
    setIsCheckingOut(true);
  
    try {
      const sepetId = uuidv4(); // Sepete özel benzersiz ID oluştur
  
      // Her bir cart item için Firestore'a veri kaydet
      const promises = cartItems.map(async (item) => {
        try {
          const saleData = {
            Adet: Number(item.quantity),
            fiyat: Number(item.price),
            id: Number(item.id),
            urun_adi: item.name,
            tarih: new Date(),
            sepetId: sepetId // Her ürüne aynı sepetId ekleniyor
          };
  
          console.log("Saving sale data:", saleData);
  
          return await addDoc(collection(db, "satislar"), saleData);
        } catch (itemError) {
          console.error("Item save error:", itemError);
          throw itemError;
        }
      });
  
      await Promise.all(promises);
      console.log("All items saved to sales collection");
  
      // Sepeti temizle
      const clearPromises = cartItems.map(async (item) => {
        if (item.cartId && !item.cartId.startsWith('local_')) {
          return await deleteDoc(doc(db, "carts", item.cartId));
        }
        return Promise.resolve();
      });
  
      await Promise.all(clearPromises);
      console.log("Cart cleared from Firestore");
  
      setCartItems([]);
      alert(`Siparişiniz alındı! Toplam: ${totalPrice.toFixed(2)} TL\nTeşekkür ederiz!`);
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Satın alma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsCheckingOut(false);
    }
  };
  
  return (
    <div className="cart-page">
      <h2>Sepetim</h2>
      {cartItems.length === 0 ? (
        <p>Sepetinizde ürün bulunmamaktadır.</p>
      ) : (
        <>
          <div className="cart-items">
            {cartItems.map((item, index) => (
              <div key={index} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-image" />
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p>{item.price} TL x {item.quantity} = {(item.price * item.quantity).toFixed(2)} TL</p>
                </div>
                <IconButton 
                  className="remove-from-cart" 
                  onClick={() => removeFromCart(item.cartId)}
                  color="error"
                >
                  <DeleteOutline />
                </IconButton>
              </div>
            ))}
          </div>
          
          <div className="cart-total-section">
            <div className="cart-total">
              <h3>Toplam Tutar:</h3>
              <h3>{totalPrice.toFixed(2)} TL</h3>
            </div>
            <Button 
              variant="contained" 
              className="checkout-button"
              onClick={handleCheckout}
              disabled={isCheckingOut}
              style={{ backgroundColor: '#6d4c41' }}
            >
              {isCheckingOut ? 'İşleniyor...' : 'Satın Al'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
