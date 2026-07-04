from withoutbg import WithoutBG

model = WithoutBG.opensource()
result = model.remove_background("photo.avif")  # returns a PIL Image in RGBA
result.save("output2.png")  # use PNG or WebP to keep transparency