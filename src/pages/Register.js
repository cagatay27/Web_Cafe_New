import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { AppContext } from '../contexts/AppContext';

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
        <h2>Hesap Oluştur</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ad Soyad</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız ve soyadınız"
            />
          </div>
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
              placeholder="Şifreniz (en az 6 karakter)"
            />
          </div>
          <div className="form-group">
            <label>Şifre Tekrar</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
            />
          </div>
          <Button 
            variant="contained" 
            type="submit" 
            className="auth-button"
            disabled={loading}
            style={{ backgroundColor: '#6d4c41' }}
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

export default Register;