import React, { useState, useContext } from 'react';
import { Button, TextField, Avatar } from '@mui/material';
import { Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';

function Account() {
  const { user, updateUserProfile, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();
  
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

export default Account;