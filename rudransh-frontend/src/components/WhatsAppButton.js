function WhatsAppButton() {
  const phoneNumber = "7739777191"; // replace with your number

  const message = "Hello, I want information about CCTV installation.";

  const whatsappURL =
    "https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(message);

  return (
    <a
      href={whatsappURL}
      className="whatsapp-button"
      target="_blank"
      rel="noopener noreferrer"
    >
      WhatsApp
    </a>
  );
}

export default WhatsAppButton;
