import React, { useState, useEffect, useContext } from 'react';
import { Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { AppContext } from '../App';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
// Chart.js importları
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Chart.js bileşenlerini kaydet
ChartJS.register(ArcElement, Tooltip, Legend);

function AdminPanel() {
  const { user, logoutUser } = useContext(AppContext);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupedSales, setGroupedSales] = useState({});
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [productStats, setProductStats] = useState({});
  const [frequentlyBoughtTogether, setFrequentlyBoughtTogether] = useState([]);
  const navigate = useNavigate();

  // Çıkış yapma fonksiyonu
  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  useEffect(() => {
    // Check if user is admin
    if (!user || user.email !== 'admin@gmail.com') {
      setError('Bu sayfaya erişim yetkiniz yok!');
      setLoading(false);
      return;
    }

    const fetchSalesData = async () => {
      try {
        const salesQuery = query(collection(db, "satislar"), orderBy("tarih", "desc"));
        const querySnapshot = await getDocs(salesQuery);
        
        const sales = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore timestamp to Date
          const date = data.tarih instanceof Date ? data.tarih : data.tarih.toDate();
          
          sales.push({
            id: doc.id,
            ...data,
            tarih: date
          });
        });
        
        setSalesData(sales);
        
        // Group sales by sepetId
        const grouped = {};
        let revenue = 0;
        
        // Ürün istatistiklerini hesapla
        const productCounts = {};
        
        sales.forEach(sale => {
          if (!grouped[sale.sepetId]) {
            grouped[sale.sepetId] = {
              items: [],
              date: sale.tarih,
              total: 0
            };
          }
          
          grouped[sale.sepetId].items.push(sale);
          const itemTotal = sale.fiyat * sale.Adet;
          grouped[sale.sepetId].total += itemTotal;
          revenue += itemTotal;
          
          // Ürün istatistiklerini güncelle
          if (!productCounts[sale.urun_adi]) {
            productCounts[sale.urun_adi] = 0;
          }
          productCounts[sale.urun_adi] += sale.Adet;
        });
        
        // Birlikte satın alınan ürünleri analiz et
        const boughtTogether = analyzeBoughtTogether(grouped);
        
        setGroupedSales(grouped);
        setTotalRevenue(revenue);
        setProductStats(productCounts);
        setFrequentlyBoughtTogether(boughtTogether);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching sales data:", error);
        setError('Satış verileri yüklenirken bir hata oluştu.');
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [user]);

  // Birlikte satın alınan ürünleri analiz eden fonksiyon
  const analyzeBoughtTogether = (groupedSales) => {
    const productPairs = {};
    
    // Her sepet için ürün çiftlerini bul
    Object.values(groupedSales).forEach(basket => {
      if (basket.items.length > 1) {
        // Sepetteki tüm ürün çiftlerini oluştur
        for (let i = 0; i < basket.items.length; i++) {
          for (let j = i + 1; j < basket.items.length; j++) {
            const product1 = basket.items[i].urun_adi;
            const product2 = basket.items[j].urun_adi;
            
            // Ürünleri alfabetik sıraya göre sırala (aynı çifti farklı sırada saymamak için)
            const pair = [product1, product2].sort().join(' & ');
            
            if (!productPairs[pair]) {
              productPairs[pair] = 0;
            }
            productPairs[pair]++;
          }
        }
      }
    });
    
    // Çiftleri sıklığa göre sırala
    const sortedPairs = Object.entries(productPairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // En sık birlikte alınan 5 çift
    
    return sortedPairs;
  };

  // Grafik verilerini hazırla
  const prepareChartData = () => {
    const labels = Object.keys(productStats);
    const data = Object.values(productStats);
    
    // Rastgele renkler oluştur
    const backgroundColors = labels.map(() => 
      `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
    );
    
    return {
      labels,
      datasets: [
        {
          label: 'Satılan Ürün Adedi',
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
          borderWidth: 1,
        },
      ],
    };
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="admin-panel">
      {/* Admin için özel header */}
      <div className="admin-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#6d4c41',
        color: 'white',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>Admin Paneli</h2>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={handleLogout}
          style={{ backgroundColor: '#e57373' }}
        >
          Çıkış Yap
        </Button>
      </div>
      
      <div className="admin-summary">
        <div className="summary-card">
          <h3>Toplam Sipariş</h3>
          <p>{Object.keys(groupedSales).length}</p>
        </div>
        <div className="summary-card">
          <h3>Toplam Satış</h3>
          <p>{totalRevenue.toFixed(2)} TL</p>
        </div>
      </div>
      
      {/* Ürün Satış Grafiği */}
      <div className="chart-container" style={{ 
        maxWidth: '500px', 
        margin: '20px auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>Ürün Satış Dağılımı</h3>
        {Object.keys(productStats).length > 0 ? (
          <Pie data={prepareChartData()} />
        ) : (
          <p>Henüz satış verisi bulunmamaktadır.</p>
        )}
      </div>
      
      {/* Birlikte Satın Alınan Ürünler */}
      <div className="frequently-bought-together" style={{ 
        maxWidth: '800px', 
        margin: '20px auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>Birlikte Satın Alınan Ürünler</h3>
        {frequentlyBoughtTogether.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ürün Çifti</TableCell>
                  <TableCell>Birlikte Satın Alınma Sayısı</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {frequentlyBoughtTogether.map(([pair, count], index) => (
                  <TableRow key={index}>
                    <TableCell>{pair}</TableCell>
                    <TableCell>{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <p>Birlikte satın alınan ürün verisi bulunmamaktadır.</p>
        )}
      </div>
      
      <h3>Siparişler</h3>
      {Object.keys(groupedSales).length === 0 ? (
        <p>Henüz sipariş bulunmamaktadır.</p>
      ) : (
        <TableContainer component={Paper} className="orders-table">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sipariş ID</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell>Ürünler</TableCell>
                <TableCell>Toplam</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(groupedSales).map(([sepetId, data]) => (
                <TableRow key={sepetId}>
                  <TableCell>{sepetId.substring(0, 8)}...</TableCell>
                  <TableCell>{data.date.toLocaleString()}</TableCell>
                  <TableCell>
                    <ul className="order-items-list">
                      {data.items.map((item, index) => (
                        <li key={index}>
                          {item.urun_adi} x {item.Adet} ({item.fiyat} TL)
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>{data.total.toFixed(2)} TL</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

export default AdminPanel;