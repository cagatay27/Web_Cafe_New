import React, { useState, useEffect, useContext } from 'react';
import { Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import { AppContext } from '../App';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
// Chart.js importları
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
// Gemini API - güncellenmiş import
import { generateText } from '../gemini';

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
  
  // Gemini AI için state'ler
  const [productAssociationAnalysis, setProductAssociationAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(''); // Hata mesajları için yeni state

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
          
          // Fiyat bilgisini doğru şekilde al (mobil ve web uygulaması uyumluluğu için)
          let price = 0;
          if (typeof sale.fiyat === 'number') {
            price = sale.fiyat;
          } else if (typeof sale.price === 'number') {
            // Mobil uygulama "price" alanını kullanıyor olabilir
            price = sale.price;
          } else if (typeof sale.fiyat === 'string') {
            // String olarak kaydedilmiş olabilir, sayıya çevir
            price = parseFloat(sale.fiyat);
          } else if (typeof sale.price === 'string') {
            price = parseFloat(sale.price);
          }
          
          // Adet bilgisini doğru şekilde al
          let quantity = 1;
          if (typeof sale.Adet === 'number') {
            quantity = sale.Adet;
          } else if (typeof sale.quantity === 'number') {
            // Mobil uygulama "quantity" alanını kullanıyor olabilir
            quantity = sale.quantity;
          } else if (typeof sale.Adet === 'string') {
            quantity = parseInt(sale.Adet, 10);
          } else if (typeof sale.quantity === 'string') {
            quantity = parseInt(sale.quantity, 10);
          }
          
          // NaN kontrolü yap
          if (isNaN(price)) price = 0;
          if (isNaN(quantity)) quantity = 1;
          
          // Güncellenmiş satış nesnesi
          const updatedSale = {
            ...sale,
            normalizedPrice: price,
            normalizedQuantity: quantity
          };
          
          grouped[sale.sepetId].items.push(updatedSale);
          const itemTotal = price * quantity;
          grouped[sale.sepetId].total += itemTotal;
          revenue += itemTotal;
          
          // Ürün istatistiklerini güncelle
          if (!productCounts[sale.urun_adi]) {
            productCounts[sale.urun_adi] = 0;
          }
          productCounts[sale.urun_adi] += quantity;
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

  // Gemini API ile Ürün Birlikteliği Analizi - Geliştirilmiş hata yönetimi
  const analyzeProductAssociations = async () => {
    setAiLoading(true);
    setAiError(''); // Hata mesajını temizle
    
    try {
      // Veri kontrolü - eğer yeterli sepet verisi yoksa
      if (Object.keys(groupedSales).length < 2) {
        setAiError('Analiz için yeterli sepet verisi bulunmuyor. En az 2 farklı sepet gereklidir.');
        setAiLoading(false);
        return;
      }
      
      // Sepet verilerini JSON formatına dönüştür - boyut sınırlaması ekle
      // Veri setini küçült - en fazla 20 sepet kullan (API sınırlamaları için)
      const basketIds = Object.keys(groupedSales).slice(0, 20);
      const basketsForAnalysis = basketIds.map(sepetId => {
        const data = groupedSales[sepetId];
        return {
          sepetId: sepetId.substring(0, 8), // Sepet ID'sini kısalt
          tarih: data.date.toISOString().split('T')[0], // Sadece tarih kısmını al
          urunler: data.items.map(item => ({
            urun_adi: item.urun_adi,
            adet: item.normalizedQuantity || item.Adet
          })), // Fiyat bilgisini çıkar, token tasarrufu için
          toplam: Math.round(data.total) // Tam sayıya yuvarla
        };
      });
      
      // Ürün istatistiklerini hazırla
      const productStats = {};
      const productDayStats = {};
      
      // Tüm ürünleri ve günleri analiz et
      Object.values(groupedSales).forEach(basket => {
        const day = basket.date.toLocaleDateString('tr-TR', { weekday: 'long' });
        
        basket.items.forEach(item => {
          const productName = item.urun_adi;
          const quantity = item.normalizedQuantity || item.Adet || 1;
          
          // Ürün istatistiklerini güncelle
          if (!productStats[productName]) {
            productStats[productName] = 0;
          }
          productStats[productName] += quantity;
          
          // Gün bazlı ürün istatistiklerini güncelle
          if (!productDayStats[productName]) {
            productDayStats[productName] = {};
          }
          
          if (!productDayStats[productName][day]) {
            productDayStats[productName][day] = 0;
          }
          
          productDayStats[productName][day] += quantity;
        });
      });
      
      // Gemini'ye gönderilecek prompt - yeni analiz soruları
      const prompt = `
        Bir kafe için satış analizi yapmak istiyorum. Aşağıda JSON formatında sepet verileri bulunmaktadır:
        
        ${JSON.stringify(basketsForAnalysis, null, 0)}
        
        Bu verilere göre aşağıdaki soruları yanıtla:
        
        1. En az satın alınan 3 ürünü belirle
        2. Bu az satılan ürünlerin hangi günlerde en az tercih edildiğini analiz et
        3. Bu ürünlerin satışını artırmak için 3 farklı kampanya önerisi sun
        4. Önerdiğin kampanyaların hangi günlerde uygulanması daha etkili olur ve neden?
        5. Az satılan ürünleri daha çok satan ürünlerle birlikte sunmak için kombinasyon önerileri ver
        
        Yanıtını Türkçe olarak, kısa ve öz şekilde, maddeler halinde düzenle. Lütfen her maddeyi açık ve anlaşılır şekilde açıkla.
      `;
      
      console.log("Gemini'ye gönderilen istek boyutu:", prompt.length);
      
      // Gemini'yi çağır, 15 saniye timeout ekle
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('İstek zaman aşımına uğradı')), 15000)
      );
      
      const analysisPromise = generateText(prompt);
      
      // Ya analiz sonucu ya da timeout gelecek
      const analysis = await Promise.race([analysisPromise, timeoutPromise]);
      
      if (analysis && analysis.includes("Üzgünüm, bir hata oluştu")) {
        throw new Error("API yanıt vermedi");
      }
      
      // Markdown sembollerini temizle (* işaretlerini kaldır)
      const cleanedAnalysis = analysis.replace(/^\s*\*\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      
      setProductAssociationAnalysis(cleanedAnalysis);
    } catch (error) {
      console.error("Ürün birlikteliği analizi hatası:", error);
      setAiError(`Analiz yapılırken bir hata oluştu: ${error.message}. API bağlantısını kontrol edin.`);
      setProductAssociationAnalysis(""); // Hata durumunda analiz sonucunu temizle
    } finally {
      setAiLoading(false);
    }
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
          <p>{isNaN(totalRevenue) ? "0.00" : totalRevenue.toFixed(2)} TL</p>
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
      
      {/* Gemini AI Ürün Birlikteliği Analizi */}
      <div className="ai-analysis" style={{ 
        maxWidth: '800px', 
        margin: '20px auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>Yapay Zeka Satış ve Kampanya Analizi</h3>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={analyzeProductAssociations}
          disabled={aiLoading || Object.keys(groupedSales).length === 0}
          style={{ marginBottom: '20px' }}
        >
          {aiLoading ? <CircularProgress size={24} color="inherit" /> : "Analiz Yap"}
        </Button>
        
        {/* Hata mesajı gösterme */}
        {aiError && (
          <div className="error-message" style={{
            color: 'red',
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: '#ffebee',
            borderRadius: '4px'
          }}>
            {aiError}
          </div>
        )}
        
        {productAssociationAnalysis && (
          <div className="analysis-result" style={{ 
            whiteSpace: 'pre-line',
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '5px',
            marginTop: '10px'
          }}>
            {productAssociationAnalysis}
          </div>
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
                          {item.urun_adi} x {item.normalizedQuantity || item.Adet} ({item.normalizedPrice || item.fiyat} TL)
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>{isNaN(data.total) ? "0.00" : data.total.toFixed(2)} TL</TableCell>
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