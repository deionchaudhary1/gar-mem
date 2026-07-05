export default function OutfitCollage({ outfit }) {
  return (
    <div className="outfit-render">
      {outfit.items.map((item) => (
        <div
          key={item.id}
          className="outfit-render__item"
          style={{
            left: `${item.position_x * 100}%`,
            top: `${item.position_y * 100}%`,
            transform: `translate(-50%, -50%) scale(${item.scale})`,
          }}
        >
          <img src={item.garment.image_path} alt={item.garment.name} />
        </div>
      ))}
    </div>
  )
}
