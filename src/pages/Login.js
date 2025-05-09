import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, TextField } from '@mui/material';
import { AppContext } from '../App';

function Login() {
  const { loginUser } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const success = await loginUser(email, password);
      if (success) {
        if (email === 'admin@gmail.com') {
          navigate('/admin'); // Admin paneline yönlendir
        } else {
          navigate('/'); // Normal kullanıcıları ana sayfaya yönlendir
        }
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

export default Login;