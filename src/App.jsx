
import { useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { contractAddress, contractABI } from "./config/contract";
import "./App.css";

const BACKEND_URL = "https://petid-chain.onrender.com";

function App() {
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [microchipId, setMicrochipId] = useState("");
  const [petId, setPetId] = useState("");
  const [pet, setPet] = useState(null);
  const [petImage, setPetImage] = useState("");
  const [petFile, setPetFile] = useState(null);
  const [newOwner, setNewOwner] = useState("");
  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [showPetCard, setShowPetCard] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("กรุณาติดตั้ง MetaMask");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0]);
    } catch (error) {
      console.error(error);
      alert("เชื่อมต่อ Wallet ไม่สำเร็จ");
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setPet(null);
    setPetId("");
    setNewOwner("");
    setPetImage("");
    alert("ยกเลิกการเชื่อมต่อ Wallet แล้ว");
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("รูปภาพต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    setPetFile(file);
    setPetImage(URL.createObjectURL(file));
  };

  const getImageUrl = (imageURI) => {
    if (!imageURI) {
      return "";
    }

    const uri = imageURI.toString().trim();

    if (uri.startsWith("ipfs://")) {
      const cid = uri
        .replace("ipfs://", "")
        .split("/")
        .filter(Boolean)
        .join("/");

      return `https://gateway.pinata.cloud/ipfs/${cid}`;
    }

    if (uri.includes("/ipfs/")) {
      return uri;
    }

    if (
      uri.startsWith("Qm") ||
      uri.startsWith("bafy") ||
      uri.startsWith("bafk")
    ) {
      return `https://gateway.pinata.cloud/ipfs/${uri}`;
    }

    if (uri.startsWith("https://") || uri.startsWith("http://")) {
      return uri;
    }

    return "";
  };

  const handlePetImageError = () => {
    if (!pet?.imageURI) {
      setPetImage("");
      return;
    }

    const uri = pet.imageURI.toString().trim();

    if (uri.startsWith("ipfs://")) {
      const cid = uri
        .replace("ipfs://", "")
        .split("/")
        .filter(Boolean)
        .join("/");

      setPetImage(`https://ipfs.io/ipfs/${cid}`);
    }
  };

  const uploadImage = async () => {
    if (!petFile) {
      throw new Error("กรุณาเลือกรูปสัตว์เลี้ยง");
    }

    const formData = new FormData();
    formData.append("file", petFile);

    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "อัปโหลดรูปไม่สำเร็จ");
    }

    if (!data.imageURI) {
      throw new Error("อัปโหลดสำเร็จแต่ไม่ได้รับ Image URI จาก Backend");
    }

    return data.imageURI;
  };

  const registerPet = async () => {
    if (!account) {
      alert("กรุณา Connect Wallet ก่อน");
      return;
    }

    if (!name || !species || !breed || !microchipId) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    if (!petFile) {
      alert("กรุณาเลือกรูปสัตว์เลี้ยง");
      return;
    }

    try {
      setLoading(true);

      const imageURI = await uploadImage();

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(
        contractAddress,
        contractABI,
        signer
      );

      const transaction = await contract.registerPet(
        name,
        species,
        breed,
        microchipId,
        imageURI
      );

      await transaction.wait();

      const count = await contract.getPetCount();
      const newPetId = count.toString();

      setPetId(newPetId);

      alert(`ลงทะเบียนสำเร็จ! Pet ID = ${newPetId}`);

      setName("");
      setSpecies("");
      setBreed("");
      setMicrochipId("");
      setPetFile(null);
      setPetImage("");
    } catch (error) {
      console.error(error);
      alert(error.message || "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const getPet = async () => {
    if (!petId) {
      alert("กรุณากรอก Pet ID");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);

      const contract = new Contract(
        contractAddress,
        contractABI,
        provider
      );

      const result = await contract.getPet(petId);

      const petData = {
        id: result[0].toString(),
        name: result[1],
        species: result[2],
        breed: result[3],
        microchipId: result[4],
        imageURI: result[5],
        owner: result[6],
        exists: result[7],
      };

      setPet(petData);

      const imageUrl = getImageUrl(petData.imageURI);

      setPetImage(imageUrl);

      if (!imageUrl) {
        alert("พบข้อมูลสัตว์เลี้ยง แต่ไม่พบ Image URI");
      }
    } catch (error) {
      console.error(error);
      setPet(null);
      setPetImage("");
      alert("ไม่พบข้อมูลสัตว์เลี้ยง");
    }
  };

  const transferOwnership = async () => {
    if (!account) {
      alert("กรุณา Connect Wallet ก่อน");
      return;
    }

    if (!petId) {
      alert("กรุณากรอก Pet ID");
      return;
    }

    if (!newOwner) {
      alert("กรุณากรอก Wallet Address ของเจ้าของใหม่");
      return;
    }

    try {
      setTransferLoading(true);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(
        contractAddress,
        contractABI,
        signer
      );

      const transaction = await contract.transferOwnership(
        petId,
        newOwner
      );

      await transaction.wait();

      alert("โอนความเป็นเจ้าของสำเร็จ");

      setNewOwner("");

      await getPet();
    } catch (error) {
      console.error(error);
      alert("โอนความเป็นเจ้าของไม่สำเร็จ");
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            <div className="logo-icon">🐾</div>

            <div>
              <h1>PetID Chain</h1>
              <p>Digital Identity for Pets</p>
            </div>
          </div>

          <div className="header-actions">
            {account ? (
              <div className="wallet-connected">
                <button className="wallet-btn connected">
                  🦊 {account.slice(0, 6)}...{account.slice(-4)}
                </button>

                <button
                  className="disconnect-btn"
                  onClick={disconnectWallet}
                >
                  ✕ ยกเลิกเชื่อมต่อ
                </button>
              </div>
            ) : (
              <button
                className="wallet-btn"
                onClick={connectWallet}
              >
                🦊 Connect Wallet
              </button>
            )}
          </div>
        </header>

        <section className="hero">
          <div className="hero-content">
            <div className="hero-main">
              <div className="hero-badge">
                ⛓️ Blockchain Pet Identity
              </div>

              <h2>
                Your Pet's Identity,
                <br />
                <span>Secured on Blockchain</span> 🐶
              </h2>

              <p className="hero-text">
                ระบบบัตรประจำตัวสัตว์เลี้ยงบน Blockchain
                สำหรับลงทะเบียนและตรวจสอบข้อมูลสัตว์เลี้ยง
                พร้อมยืนยันเจ้าของผ่าน Wallet
              </p>
            </div>

            <div className="hero-qr">
              <div className="hero-qr-card">
                <div className="hero-qr-title">
                  <span>📱</span>

                  <div>
                    <strong>Scan to Visit</strong>
                    <small>PetID Chain</small>
                  </div>
                </div>

                <div className="hero-qr-code">
                  <QRCodeSVG
                    value="https://petid-chain.vercel.app/"
                    size={120}
                    bgColor="#ffffff"
                    fgColor="#4a4050"
                    level="M"
                  />
                </div>

                <p>สแกนเพื่อเข้าสู่เว็บไซต์</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid">
          <section className="card">
            <div className="card-header">
              <div className="card-icon">🐕</div>

              <div>
                <h2>ลงทะเบียนสัตว์เลี้ยง</h2>
                <p className="card-description">
                  Create your pet's digital identity
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>ชื่อสัตว์เลี้ยง</label>

              <input
                placeholder="เช่น Mochi"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>ประเภทสัตว์</label>

              <input
                placeholder="เช่น Dog / Cat"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>สายพันธุ์</label>

              <input
                placeholder="เช่น Shih Tzu"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Microchip ID</label>

              <input
                placeholder="หมายเลข Microchip"
                value={microchipId}
                onChange={(e) => setMicrochipId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>รูปภาพสัตว์เลี้ยง</label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            {petImage && !pet && (
              <div className="image-preview">
                <img
                  src={petImage}
                  alt="Pet Preview"
                  onError={handlePetImageError}
                />
              </div>
            )}

            <button
              className="primary-btn"
              onClick={registerPet}
              disabled={loading}
            >
              {loading
                ? "⏳ กำลังอัปโหลดและบันทึก..."
                : "🐾 Register Pet"}
            </button>

            {petId && (
              <div className="pet-id">
                🎉 ลงทะเบียนสำเร็จ — Pet ID #{petId}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <div className="card-icon">🔎</div>

              <div>
                <h2>ตรวจสอบสัตว์เลี้ยง</h2>
                <p className="card-description">
                  Verify pet information on Blockchain
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>Pet ID</label>

              <input
                placeholder="กรอกหมายเลข Pet ID"
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
              />
            </div>

            <button
              className="secondary-btn"
              onClick={getPet}
            >
              🔍 ตรวจสอบข้อมูล
            </button>

            {pet && (
              <div className="pet-result">
                <div className="pet-result-title">
                  🐾 ข้อมูลสัตว์เลี้ยง
                </div>

                <div className="pet-info">
                  <div className="pet-info-row">
                    <span className="pet-label">Pet ID</span>
                    <span className="pet-value">
                      #{pet.id}
                    </span>
                  </div>

                  <div className="pet-info-row">
                    <span className="pet-label">ชื่อ</span>
                    <span className="pet-value">
                      {pet.name}
                    </span>
                  </div>

                  <div className="pet-info-row">
                    <span className="pet-label">ประเภท</span>
                    <span className="pet-value">
                      {pet.species}
                    </span>
                  </div>

                  <div className="pet-info-row">
                    <span className="pet-label">สายพันธุ์</span>
                    <span className="pet-value">
                      {pet.breed}
                    </span>
                  </div>

                  <div className="pet-info-row">
                    <span className="pet-label">Microchip</span>
                    <span className="pet-value">
                      {pet.microchipId}
                    </span>
                  </div>

                  <div className="pet-info-row">
                    <span className="pet-label">เจ้าของ</span>
                    <span className="pet-value owner-address">
                      {pet.owner}
                    </span>
                  </div>
                </div>

                <button
                  className="secondary-btn"
                  onClick={() => setShowPetCard(true)}
                >
                  🎫Pet Card
                </button>

                <div className="form-group">
                  <label>Wallet Address เจ้าของใหม่</label>

                  <input
                    placeholder="0x..."
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                  />
                </div>

                <button
                  className="primary-btn"
                  onClick={transferOwnership}
                  disabled={transferLoading}
                >
                  {transferLoading
                    ? "⏳ กำลังโอน..."
                    : "🔄 Transfer Ownership"}
                </button>
              </div>
            )}
          </section>
        </div>

        {showPetCard && pet && (
          <div
            className="modal-overlay"
            onClick={() => setShowPetCard(false)}
          >
            <div
              className="pet-card-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-btn"
                onClick={() => setShowPetCard(false)}
              >
                ✕
              </button>

              <div className="pet-card-top">
                <div className="pet-card-logo">🐾</div>

                <div>
                  <h2>PetID Chain</h2>
                  <p>Pet Digital Identity Card</p>
                </div>
              </div>

              <div className="pet-card-title">
                <span>บัตรประจำตัวสัตว์เลี้ยง</span>
                <strong>PET ID #{pet.id}</strong>
              </div>

              <div className="pet-card-content">
                <div className="pet-card-image">
                  {petImage ? (
                    <img
                      src={petImage}
                      alt={pet.name}
                      onError={handlePetImageError}
                    />
                  ) : (
                    <div className="no-image">🐾</div>
                  )}
                </div>

                <div className="pet-card-details">
                  <div className="pet-card-row">
                    <span>ชื่อสัตว์เลี้ยง</span>
                    <strong>{pet.name}</strong>
                  </div>

                  <div className="pet-card-row">
                    <span>ประเภท</span>
                    <strong>{pet.species}</strong>
                  </div>

                  <div className="pet-card-row">
                    <span>สายพันธุ์</span>
                    <strong>{pet.breed}</strong>
                  </div>

                  <div className="pet-card-row">
                    <span>Microchip ID</span>
                    <strong>{pet.microchipId}</strong>
                  </div>

                  <div className="pet-card-row">
                    <span>Owner Wallet</span>
                    <strong className="card-owner">
                      {pet.owner.slice(0, 10)}...
                      {pet.owner.slice(-8)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pet-card-status">
                <span>●</span>
                Verified on Blockchain
              </div>

              <div className="pet-card-footer">
                PetID Chain · Digital Identity for Pets
              </div>
            </div>
          </div>
        )}

        <footer className="footer">
          🐾 PetID Chain · Pet Digital Identity on
          <span> Blockchain</span>
        </footer>
      </div>
    </div>
  );
}

export default App;

