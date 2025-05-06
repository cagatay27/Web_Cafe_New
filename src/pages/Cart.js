import React, { useState, useContext, useEffect, useRef } from "react";
import {
  Alert,
  Button,
  IconButton,
  Snackbar,
  Paper,
  Typography,
  Box,
} from "@mui/material";
import { DeleteOutline } from "@mui/icons-material";
import { AppContext } from "../contexts/AppContext";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function Cart() {
  const { cartItems, removeFromCart, user, setCartItems } =
    useContext(AppContext);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [dateAlert, setDateAlert] = useState(false);
  const [currentDateString, setCurrentDateString] = useState("");
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  // Calculate total price considering quantity
  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Custom log function that adds to our logs state
  const logToTerminal = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [
      ...prevLogs,
      {
        id: Date.now(),
        timestamp,
        message:
          typeof message === "object"
            ? JSON.stringify(message, null, 2)
            : message,
        type,
      },
    ]);
  };

  // Scroll to bottom of logs when new logs are added
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Override console methods to also log to our terminal
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      originalConsoleLog(...args);
      logToTerminal(args.length === 1 ? args[0] : args);
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      logToTerminal(args.length === 1 ? args[0] : args, "error");
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  // Manuel Firestore belge kaydı için fonksiyon
  const saveToFirestore = async (collectionName, data) => {
    try {
      // Create a plain object with just the data (not using any special Firebase class)
      const plainData = { ...data };

      // Add the document to the collection
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, plainData);

      console.log(
        `Added document with ID: ${docRef.id} to collection ${collectionName}`
      );
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setLogs([]); // Clear previous logs

    try {
      console.log("Ödeme işlemi başlatılıyor...");

      if (!cartItems || cartItems.length === 0) {
        throw new Error("Sepetinizde ürün bulunmamaktadır.");
      }

      // Tarih oluştur ve göster
      const currentDate = new Date();
      const tarihString = currentDate.toLocaleString("tr-TR");
      setCurrentDateString(tarihString);
      setDateAlert(true);

      // Benzersiz sepet ID oluştur
      const sepetId = `sepet_${Date.now()}_${
        user ? user.uid.substring(0, 5) : "guest"
      }`;
      console.log("Oluşturulan sepet ID:", sepetId);

      // Her sepet öğesi için satış kaydı oluştur
      const successfulItems = [];

      for (const item of cartItems) {
        try {
          // Veriyi hazırla
          const saleData = {
            Adet: Number(item.quantity || 1),
            fiyat: Number(item.price || 0),
            id: Number(item.id),
            urun_adi: item.name || "Ürün",
            // Timestamp özel olarak oluştur - bu alan kritik
            tarihSatis: Timestamp.now(),
            // sepetId bir string olarak ekle - bu alan kritik
            sepetId: sepetId,
          };

          // Veriyi Firestore'a manuel olarak ekle
          const docId = await saveToFirestore("satislar", saleData);
          console.log(
            `${item.name} ürünü satışı kaydedildi, belge ID: ${docId}`
          );

          // Başarılı öğeleri izle
          successfulItems.push(item);

          // Sepetten öğeyi kaldır
          if (item.cartId && !item.cartId.startsWith("local_")) {
            await deleteDoc(doc(db, "carts", item.cartId));
          }
        } catch (error) {
          console.error(
            `${item.name} ürününün satış kaydı oluşturulurken hata:`,
            error
          );
          // Hata durumunda diğer ürünlerle devam et
        }
      }

      // Başarılı öğeleri yerel sepetten kaldır
      if (successfulItems.length > 0) {
        // Kalan öğeleri bul
        const remainingItems = cartItems.filter(
          (item) =>
            !successfulItems.some(
              (successItem) => successItem.cartId === item.cartId
            )
        );

        // Cart'ı güncelle
        setCartItems(remainingItems);

        console.log(
          `${successfulItems.length} ürün başarıyla satıldı ve sepetten kaldırıldı.`
        );

        if (remainingItems.length === 0) {
          alert(
            `Siparişiniz alındı! Toplam: ${totalPrice.toFixed(
              2
            )} TL\nTeşekkür ederiz!`
          );
        } else {
          alert(
            `${successfulItems.length} ürün başarıyla satın alındı, ancak ${remainingItems.length} ürün işlenirken sorun yaşandı. Lütfen tekrar deneyin.`
          );
        }
      } else {
        throw new Error("Hiçbir ürün kaydedilemedi, lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Ödeme işlemi hatası:", error);
      alert(`Satın alma işlemi sırasında bir hata oluştu: ${error.message}`);
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
                  <p>
                    {item.price} TL x {item.quantity} ={" "}
                    {(item.price * item.quantity).toFixed(2)} TL
                  </p>
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
              style={{ backgroundColor: "#6d4c41" }}
            >
              {isCheckingOut ? "İşleniyor..." : "Satın Al"}
            </Button>
          </div>
        </>
      )}

      {/* Terminal-like log display */}
      {logs.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            mt: 4,
            p: 2,
            bgcolor: "#000",
            color: "#0f0",
            maxHeight: "300px",
            overflow: "auto",
            fontFamily: "monospace",
          }}
        >
          <Typography variant="h6" sx={{ color: "#fff", mb: 1 }}>
            İşlem Logları:
          </Typography>
          {logs.map((log) => (
            <Box
              key={log.id}
              sx={{
                mb: 0.5,
                color: log.type === "error" ? "#f44336" : "#0f0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              [{log.timestamp}] {log.message}
            </Box>
          ))}
          <div ref={logEndRef} />
        </Paper>
      )}

      {/* Tarih bilgisini gösteren bildirim */}
      <Snackbar
        open={dateAlert}
        autoHideDuration={6000}
        onClose={() => setDateAlert(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setDateAlert(false)}
          severity="info"
          sx={{ width: "100%" }}
        >
          Tarih: {currentDateString}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Cart;
