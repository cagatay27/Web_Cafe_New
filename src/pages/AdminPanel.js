import React, { useState, useEffect, useContext } from 'react';
import { Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { AppContext } from '../App';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

function AdminPanel() {
  const { user } = useContext(AppContext);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupedSales, setGroupedSales] = useState({});
  const [totalRevenue, setTotalRevenue] = useState(0);

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
        });
        
        setGroupedSales(grouped);
        setTotalRevenue(revenue);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching sales data:", error);
        setError('Satış verileri yüklenirken bir hata oluştu.');
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [user]);

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="admin-panel">
      <h2>Admin Paneli</h2>
      
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