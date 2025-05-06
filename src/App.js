import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Badge, Avatar } from '@mui/material';
import { ShoppingCart, Favorite, Search, Home as HomeIcon, Person, DeleteOutline } from '@mui/icons-material';
import './App.css';
import { coffeeItems, cookieItems, foodItems, coldDrinkItems } from './data';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

// Create AppContext
const AppContext = createContext();

function App() {
  const [cartItems, setCartItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            ...userDoc.data()
          });
        } else {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            name: '',
            profileImage: '',
            createdAt: new Date().toISOString()
          });
        }
        
        // Load cart items
        await loadCartItems(currentUser.uid);
        
        // Load favorite items
        await loadFavoriteItems(currentUser.uid);
      } else {
        setUser(null);
        setCartItems([]);
        setFavoriteItems([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadCartItems = async (userId) => {
    try {
      const cartQuery = query(collection(db, "carts"), where("userId", "==", userId));
      const querySnapshot = await getDocs(cartQuery);
      const items = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: data.itemId,
          name: data.name,
          price: data.price,
          image: data.image,
          quantity: data.quantity || 1,
          cartId: doc.id // Store the document ID for removal functionality
        });
      });
      
      setCartItems(items);
    } catch (error) {
      console.error("Error loading cart items:", error);
    }
  };

  const loadFavoriteItems = async (userId) => {
    try {
      const favQuery = query(collection(db, "favorites"), where("userId", "==", userId));
      const querySnapshot = await getDocs(favQuery);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push(doc.data().item);
      });
      setFavoriteItems(items);
    } catch (error) {
      console.error("Error loading favorite items:", error);
    }
  };

  const addToCart = async (item) => {
    if (!user) {
      alert('Lütfen önce giriş yapın');
      return;
    }
    
    try {
      // Check if item already exists in cart
      const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex !== -1) {
        // Item exists, update quantity
        const updatedCartItems = [...cartItems];
        updatedCartItems[existingItemIndex].quantity += 1;
        
        // Update in Firestore
        await updateDoc(doc(db, "carts", updatedCartItems[existingItemIndex].cartId), {
          quantity: updatedCartItems[existingItemIndex].quantity
        });
        
        // Update local state
        setCartItems(updatedCartItems);
        alert(`${item.name} sepete eklendi! Toplam: ${updatedCartItems[existingItemIndex].quantity} adet`);
      } else {
        // Create a simpler cart item structure
        const cartItem = {
          userId: user.uid,
          itemId: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: 1,
          addedAt: new Date().toISOString()
        };
        
        // Add to Firestore
        try {
          const docRef = await addDoc(collection(db, "carts"), cartItem);
          
          // Update local state with cartId for removal functionality
          setCartItems([...cartItems, {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1,
            cartId: docRef.id
          }]);
          
          alert(`${item.name} sepete eklendi!`);
        } catch (firestoreError) {
          console.error("Firestore error:", firestoreError);
          
          // Fallback: Update only local state if Firestore fails
          const localCartItem = {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1,
            cartId: `local_${Date.now()}`
          };
          
          setCartItems([...cartItems, localCartItem]);
          alert(`${item.name} sepete eklendi! (Yerel)`);
        }
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      
      // Fallback: Update only local state
      const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex !== -1) {
        // Item exists, update quantity locally
        const updatedCartItems = [...cartItems];
        updatedCartItems[existingItemIndex].quantity += 1;
        setCartItems(updatedCartItems);
      } else {
        // Add new item locally
        const localCartItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: 1,
          cartId: `local_${Date.now()}`
        };
        
        setCartItems([...cartItems, localCartItem]);
      }
      
      alert(`${item.name} sepete eklendi! (Yerel)`);
    }
  };

  // Add removeFromCart functionality
  const removeFromCart = async (cartId) => {
    if (!user) return;
    
    try {
      // Check if it's a local item
      if (cartId.startsWith('local_')) {
        // Just remove from local state
        setCartItems(cartItems.filter(item => item.cartId !== cartId));
        return;
      }
      
      // Delete from Firestore
      try {
        await deleteDoc(doc(db, "carts", cartId));
      } catch (firestoreError) {
        console.error("Firestore delete error:", firestoreError);
        // Continue with local removal even if Firestore fails
      }
      
      // Update local state
      setCartItems(cartItems.filter(item => item.cartId !== cartId));
    } catch (error) {
      console.error("Error removing from cart:", error);
      // Still remove from local state
      setCartItems(cartItems.filter(item => item.cartId !== cartId));
    }
  };

  const addToFavorites = async (item) => {
    if (!user) {
      alert('Lütfen önce giriş yapın');
      return;
    }
    
    try {
      // Check if item already exists in favorites
      const existingItem = favoriteItems.find(favItem => favItem.id === item.id);
      
      if (existingItem) {
        alert(`${item.name} zaten favorilerinizde!`);
        return;
      }
      
      // Add to Firestore
      try {
        const favItem = {
          userId: user.uid,
          itemId: item.id,
          item: {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image
          },
          addedAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, "favorites"), favItem);
        
        // Update local state
        setFavoriteItems([...favoriteItems, item]);
        alert(`${item.name} favorilere eklendi!`);
      } catch (firestoreError) {
        console.error("Firestore favorites error:", firestoreError);
        
        // Fallback: Update only local state
        setFavoriteItems([...favoriteItems, item]);
        alert(`${item.name} favorilere eklendi! (Yerel)`);
      }
    } catch (error) {
      console.error("Error adding to favorites:", error);
      
      // Fallback: Update only local state
      setFavoriteItems([...favoriteItems, item]);
      alert(`${item.name} favorilere eklendi! (Yerel)`);
    }
  };

  // Add removeFromFavorites functionality
  const removeFromFavorites = async (itemId) => {
    if (!user) return;
    
    try {
      // Find the item in favorites
      const itemToRemove = favoriteItems.find(item => item.id === itemId);
      
      if (!itemToRemove) return;
      
      // Find document ID in Firestore
      try {
        const favQuery = query(
          collection(db, "favorites"), 
          where("userId", "==", user.uid),
          where("itemId", "==", itemId)
        );
        
        const querySnapshot = await getDocs(favQuery);
        
        if (!querySnapshot.empty) {
          // Delete from Firestore
          querySnapshot.forEach(async (document) => {
            await deleteDoc(doc(db, "favorites", document.id));
          });
        }
      } catch (firestoreError) {
        console.error("Firestore favorites delete error:", firestoreError);
        // Continue with local removal even if Firestore fails
      }
      
      // Update local state
      setFavoriteItems(favoriteItems.filter(item => item.id !== itemId));
      alert(`${itemToRemove.name} favorilerden kaldırıldı!`);
    } catch (error) {
      console.error("Error removing from favorites:", error);
      // Still remove from local state
      setFavoriteItems(favoriteItems.filter(item => item.id !== itemId));
    }
  };

  const registerUser = async (userData) => {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      // Add user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: userData.name,
        email: userData.email,
        profileImage: '',
        createdAt: new Date().toISOString()
      });
      
      console.log("User registered successfully:", userCredential.user.uid);
      return true;
    } catch (error) {
      console.error("Error registering user:", error.code, error.message);
      throw error; // Rethrow to handle in the component
    }
  };

  const loginUser = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Error logging in:", error);
      return false;
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateUserProfile = async (updatedData) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, "users", user.uid), updatedData);
      setUser({ ...user, ...updatedData });
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  // Create context value
  const contextValue = {
    cartItems,
    setCartItems,
    favoriteItems,
    addToCart,
    removeFromCart,
    addToFavorites,
    removeFromFavorites,
    user,
    registerUser,
    loginUser,
    logoutUser,
    updateUserProfile,
    loading
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <div className="App">
          <AppBar position="static" style={{ backgroundColor: '#6d4c41' }}>
            <Toolbar>
              <Typography variant="h6" component={Link} to={user ? "/" : "/login"} style={{ flexGrow: 1, textDecoration: 'none', color: 'white' }}>
                <HomeIcon style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                Cafe Catalog
              </Typography>
              {user && (
                <>
                  <IconButton color="inherit" component={Link} to="/cart">
                    <Badge badgeContent={cartItems.length} color="secondary">
                      <ShoppingCart />
                    </Badge>
                  </IconButton>
                  <IconButton color="inherit" component={Link} to="/favorites">
                    <Badge badgeContent={favoriteItems.length} color="secondary">
                      <Favorite />
                    </Badge>
                  </IconButton>
                  <IconButton 
                    color="inherit" 
                    component={Link} 
                    to="/account"
                    style={{ marginLeft: '8px' }}
                  >
                    {user.profileImage ? (
                      <Avatar 
                        src={user.profileImage} 
                        alt={user.name} 
                        sx={{ width: 32, height: 32, border: '2px solid white' }} 
                      />
                    ) : (
                      <Person style={{ fontSize: '28px' }} />
                    )}
                  </IconButton>
                </>
              )}
              {!user && (
                <Button color="inherit" component={Link} to="/login">
                  Giriş Yap
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Routes>
            <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
            <Route path="/cart" element={user ? <Cart /> : <Navigate to="/login" />} />
            <Route path="/favorites" element={user ? <Favorites /> : <Navigate to="/login" />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
            <Route path="/account" element={user ? <Account /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
          </Routes>
        </div>
      </Router>
    </AppContext.Provider>
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

// Update Cart component to include remove functionality and checkout
function Cart() {
  const { cartItems, removeFromCart, user, setCartItems } = useContext(AppContext);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Calculate total price considering quantity
  const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    
    try {
      // Save each cart item to the "satislar" collection
      const promises = cartItems.map(async (item) => {
        try {
          // Veri yapısını tam olarak görseldeki gibi oluştur
          const saleData = {
            Adet: Number(item.quantity),
            fiyat: Number(item.price),
            id: Number(item.id),
            urun_adi: item.name
          };
          
          console.log("Saving sale data:", saleData);
          
          // Veriyi Firestore'a ekle ve promise'i döndür
          return await addDoc(collection(db, "satislar"), saleData);
        } catch (itemError) {
          console.error("Item save error:", itemError);
          throw itemError; // Hatayı yukarı fırlat
        }
      });
      
      // Tüm promise'lerin tamamlanmasını bekle
      await Promise.all(promises);
      console.log("All items saved to sales collection");
      
      // Clear cart items from Firestore
      const clearPromises = cartItems.map(async (item) => {
        if (item.cartId && !item.cartId.startsWith('local_')) {
          return await deleteDoc(doc(db, "carts", item.cartId));
        }
        return Promise.resolve();
      });
      
      await Promise.all(clearPromises);
      console.log("Cart cleared from Firestore");
      
      // Clear local cart
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

function Favorites() {
  const { favoriteItems, removeFromFavorites } = useContext(AppContext);
  
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

function Login() {
  const navigate = useNavigate();
  const { loginUser, user } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const success = await loginUser(email, password);
      if (success) {
        navigate('/'); // Redirect to home/menu page after login
      } else {
        setError('E-posta veya şifre hatalı');
      }
    } catch (error) {
      console.error("Login error:", error);
      setError('Giriş yapılırken bir hata oluştu: ' + error.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Giriş Yap</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-posta</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
            />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreniz"
            />
          </div>
          <Button 
            variant="contained" 
            type="submit" 
            className="auth-button"
          >
            Giriş Yap
          </Button>
        </form>
        <div className="auth-footer">
          Hesabınız yok mu? <Link to="/register">Kaydol</Link>
        </div>
      </div>
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  const { registerUser, user } = useContext(AppContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    const userData = {
      name,
      email,
      password,
      profileImage: '',
      createdAt: new Date().toISOString()
    };

    setLoading(true);
    setError('');
    
    try {
      const success = await registerUser(userData);
      setLoading(false);
      if (success) {
        alert('Kayıt işlemi başarılı! Giriş yapabilirsiniz.');
        navigate('/login');
      }
    } catch (error) {
      setLoading(false);
      console.error("Registration error:", error);
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kullanılıyor');
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi');
      } else if (error.code === 'auth/weak-password') {
        setError('Şifre çok zayıf');
      } else {
        setError('Kayıt olurken bir hata oluştu: ' + error.message);
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Kaydol</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ad Soyad</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız ve soyadınız"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>E-posta</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreniz (en az 6 karakter)"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Şifre Tekrar</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              disabled={loading}
            />
          </div>
          <Button 
            variant="contained" 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Kaydediliyor...' : 'Kaydol'}
          </Button>
        </form>
        <div className="auth-footer">
          Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
        </div>
      </div>
    </div>
  );
}

function Account() {
  const navigate = useNavigate();
  const { user, logoutUser, updateUserProfile } = useContext(AppContext);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const handleProfileUpdate = () => {
    updateUserProfile({ profileImage });
    alert('Profil bilgileriniz güncellendi!');
  };

  return (
    <div className="account-page">
      <h2>Hesabım</h2>
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-image-container">
            {profileImage ? (
              <img src={profileImage} alt={user.name} className="profile-image" />
            ) : (
              <div className="profile-image-placeholder">
                <Person style={{ fontSize: 60 }} />
              </div>
            )}
          </div>
          <div className="profile-info">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <p>Üyelik Tarihi: {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="profile-edit-section">
          <h3>Profil Resmi Ekle</h3>
          <div className="form-group">
            <label>Profil Resmi URL'si</label>
            <input 
              type="text" 
              value={profileImage} 
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="Resim URL'si girin"
            />
          </div>
          <Button 
            variant="contained" 
            onClick={handleProfileUpdate}
            className="profile-update-button"
          >
            Profili Güncelle
          </Button>
        </div>
        
        <div className="account-actions">
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleLogout}
            className="logout-button"
          >
            Çıkış Yap
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
