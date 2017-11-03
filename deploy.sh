nvm use 8.3

npm run export

rsync -ravpzHogt out/ ./../jeffreyyoung.github.io/

cd ./../jeffreyyoung.github.io

git add -A
git commit -m "AUTO COMMIT"
git push -f

