import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Badge, Avatar } from '@mui/material';
import { ShoppingCart, Favorite, Home as HomeIcon, Person, Comment } from '@mui/icons-material';
import './App.css';
import { v4 as uuidv4 } from 'uuid';
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

// Import components
// İmport kısmına Comments bileşenini ekleyelim
import Home from './components/Home';
import Cart from './pages/Cart';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import AdminPanel from './pages/AdminPanel';
import Comments from './pages/Comments'; // Bu import'un eklendiğinden emin olun

// Bu satırları silin:
// // AppContext'i doğrudan tanımlamak yerine import edin
// import { AppProvider, AppContext } from './contexts/AppContext';

// Create AppContext
export const AppContext = createContext();

// AppWithRouter bileşenini App bileşeninden önce tanımlayalım
function AppWithRouter() {
  const location = useLocation();
  const { cartItems, favoriteItems, user, logoutUser } = useContext(AppContext);
  
  return (
    <div className="App">
      {!location.pathname.includes('/admin') && (
        <AppBar position="static" style={{ backgroundColor: '#6d4c41' }}>
          <Toolbar>
            {/* Başlığa tıklandığında kullanıcı durumuna göre yönlendirme */}
            <Typography variant="h6" component={Link} to={user ? "/" : "/login"} style={{ flexGrow: 1, textDecoration: 'none', color: 'white' }}>
              <HomeIcon style={{ marginRight: '10px', verticalAlign: 'middle' }} />
              Cafe Catalog
            </Typography>
            {user && (
              <>
                <IconButton color="inherit" component={Link} to="/comments">
                  <Comment />
                </IconButton>
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
      )}
      
      <div className="content-container">
        <Routes>
          {/* Ana sayfa rotasını koruma altına alalım */}
          <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
          <Route path="/cart" element={user ? <Cart /> : <Navigate to="/login" />} />
          <Route path="/favorites" element={user ? <Favorites /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={user ? <Account /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user && user.email === 'admin@gmail.com' ? <AdminPanel /> : <Navigate to="/login" />} />
          <Route path="/comments" element={user ? <Comments /> : <Navigate to="/login" />} />
          {/* Tanımlanmamış tüm rotaları login sayfasına yönlendir */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}

// AppContent bileşenini kaldıralım, artık kullanmıyoruz

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
      // Giriş yap
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Kullanıcı bilgilerini hemen yükle
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (userDoc.exists()) {
        // Kullanıcı bilgilerini state'e kaydet
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          ...userDoc.data()
        });
        
        // Sepet ve favorileri yükle
        await loadCartItems(userCredential.user.uid);
        await loadFavoriteItems(userCredential.user.uid);
      } else {
        // Kullanıcı Firestore'da yoksa temel bilgileri kaydet
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: '',
          profileImage: '',
          createdAt: new Date().toISOString()
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error logging in:", error);
      return false;
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      // Çıkış yapıldıktan sonra kullanıcıyı login sayfasına yönlendir
      window.location.href = '/login';
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
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <AppWithRouter />
      </Router>
    </AppContext.Provider>
  );
}

export default App;