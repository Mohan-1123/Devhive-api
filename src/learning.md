params route
query route


//wild card route// it matches any route
app.get("*", (req, res) => {
  res.send("Page not found");
});
