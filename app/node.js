try {
  const aiResponse = await openai.chat.completions.create({...})

  return res.json({
    success: true,
    data: aiResponse.choices[0].message.content
  })

} catch (err) {
  return res.json({
    success: false,
    data: "Fallback-Analyse aktiv",
    error: err.message
  })
}
