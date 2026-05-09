import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, MapPin, Phone, Mail } from 'lucide-react';
import ChatWidget from '../components/ChatWidget';
import { useAppContext } from '../context/AppContext';
import './HomePage.css';

const HomePage = () => {
  const { pastProjects } = useAppContext();

  return (
    <div className="homepage-container">
      {/* Public Header */}
      <header className="public-header glass-panel">
        <div className="container header-content">
          <div className="logo-text" style={{ fontSize: '1.75rem' }}>HDCONS</div>
          <nav className="public-nav hidden-mobile">
            <a href="#about">Về chúng tôi</a>
            <a href="#services">Dịch vụ</a>
            <a href="#projects">Dự án</a>
            <a href="#contact">Liên hệ</a>
          </nav>
          <Link to="/login" className="btn btn-primary">
            Đăng nhập Quản trị
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-content animate-fade-in">
          <h1 className="hero-title">Kiến Tạo Không Gian,<br/> Xây Dựng Tương Lai</h1>
          <p className="hero-subtitle">CÔNG TY TNHH TƯ VẤN XÂY DỰNG HỘI AN HDCONS tự hào mang đến những giải pháp thiết kế và thi công đẳng cấp, kiến tạo nên những công trình bền vững với thời gian.</p>
          <div className="hero-actions">
            <a href="#contact" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              Nhận tư vấn miễn phí <ArrowRight size={20} />
            </a>
          </div>
        </div>
        <div className="hero-overlay"></div>
      </section>

      {/* About & Trust Section */}
      <section id="about" className="section-padding bg-secondary">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="section-title">Tại sao chọn HDCONS?</h2>
              <p className="section-text">
                Với hơn 10 năm kinh nghiệm trong lĩnh vực xây dựng và thiết kế kiến trúc, HDCONS luôn đặt chữ TÍN lên hàng đầu. Chúng tôi cam kết mang lại chất lượng hoàn hảo nhất cho từng chi tiết nhỏ.
              </p>
              <ul className="trust-list">
                <li><CheckCircle className="text-success" /> Đội ngũ kỹ sư, kiến trúc sư giàu kinh nghiệm</li>
                <li><CheckCircle className="text-success" /> Minh bạch trong báo giá và vật tư</li>
                <li><CheckCircle className="text-success" /> Đúng tiến độ, đảm bảo chất lượng</li>
                <li><CheckCircle className="text-success" /> Bảo hành công trình dài hạn</li>
              </ul>
            </div>
            <div className="stats-grid">
              <div className="stat-card card">
                <h3>500+</h3>
                <p>Dự án hoàn thành</p>
              </div>
              <div className="stat-card card">
                <h3>10+</h3>
                <p>Năm kinh nghiệm</p>
              </div>
              <div className="stat-card card">
                <h3>98%</h3>
                <p>Khách hàng hài lòng</p>
              </div>
              <div className="stat-card card">
                <h3>50+</h3>
                <p>Chuyên gia</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="section-padding text-center">
        <div className="container">
          <h2 className="section-title" style={{ justifyContent: 'center' }}>Dịch vụ của chúng tôi</h2>
          <p className="section-text mx-auto" style={{ maxWidth: '600px' }}>
            Chúng tôi cung cấp giải pháp toàn diện từ thiết kế ý tưởng đến thi công hoàn thiện, chìa khóa trao tay.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="card service-card">
              <h3>Thiết kế Kiến trúc</h3>
              <p>Sáng tạo không gian sống hiện đại, đẳng cấp và tối ưu công năng.</p>
            </div>
            <div className="card service-card">
              <h3>Thi công Xây dựng</h3>
              <p>Cam kết chất lượng vật tư, tiến độ nhanh chóng và an toàn tuyệt đối.</p>
            </div>
            <div className="card service-card">
              <h3>Tư vấn & Giám sát</h3>
              <p>Đồng hành cùng chủ đầu tư trong suốt quá trình triển khai dự án.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Past Projects Section */}
      <section id="projects" className="section-padding bg-secondary">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="section-title" style={{ justifyContent: 'center' }}>Dự án đã thực hiện qua các năm</h2>
            <p className="section-text mx-auto" style={{ maxWidth: '600px' }}>
              Một số dự án tiêu biểu mà HDCONS đã tự hào đồng hành cùng quý khách hàng.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pastProjects.map(project => (
              <div key={project.id} className="card p-0" style={{ overflow: 'hidden' }}>
                <img src={project.image} alt={project.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                <div style={{ padding: '1.5rem' }}>
                  <span className="badge badge-info mb-2">Năm {project.year}</span>
                  <h3 className="text-lg font-bold mb-2">{project.name}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Contact Info */}
      <footer id="contact" className="public-footer">
        <div className="container grid md:grid-cols-2 gap-6">
          <div>
            <div className="logo-text mb-4" style={{ fontSize: '2rem' }}>HDCONS</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              CÔNG TY TNHH TƯ VẤN XÂY DỰNG HỘI AN HDCONS
            </p>
            <div className="contact-info">
              <p><MapPin size={18} /> 213 Xô Viết Nghệ Tĩnh, phường Hội An Tây, thành phố Đà Nẵng</p>
              <p><Phone size={18} /> 0901 98 96 93</p>
              <p><Mail size={18} /> xuannhut40270@gmail.com</p>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h4>Liên kết</h4>
              <ul>
                <li><a href="#about">Về chúng tôi</a></li>
                <li><a href="#services">Dịch vụ</a></li>
                <li><a href="#projects">Dự án</a></li>
              </ul>
            </div>
            <div>
              <h4>Mạng xã hội</h4>
              <ul>
                <li><a href="#">Facebook</a></li>
                <li><a href="#">Zalo</a></li>
                <li><a href="#">Youtube</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 CÔNG TY TNHH TƯ VẤN XÂY DỰNG HỘI AN HDCONS. All rights reserved.</p>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default HomePage;
