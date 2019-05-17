#!/bin/bash
wallet_address="1NhbNnW9zxSjsTfT4k6XXmgsQhp4uMqLEZ"

pause_script () {
  printf "\n\n"
  read -rsp $'Press any key to continue...\n' -n1 key
  printf "\n"
}

echo "Submit validation request"
curl  -X POST \
  http://localhost:8000/requestValidation \
  -H "Content-Type: application/json" \
  -H 'Cache-Control: no-cache' \
  -vd '{
    "address":"'${wallet_address}'"
  }'
pause_script

echo "Open Electrum wallet and sign the message"
read signature
echo "Signing message with signature '$signature'"
curl -X POST \
  http://localhost:8000/message-signature/validate \
  -H 'Content-Type: application/json' \
  -H 'Cache-Control: no-cache' \
  -vd '{
    "address":"'${wallet_address}'",
    "signature":"'${signature}'"
  }'
pause_script

echo "Submit star information to be saved on the blockchain"
curl -X POST \
  http://localhost:8000/block \
  -H 'Content-Type: application/json' \
  -H 'Cache-Control: no-cache' \
  -vd '{
    "address":"'${wallet_address}'",
    "star": {
      "dec": "68° 52'' 56.9",
      "ra": "16h 29m 1.0s",
      "story": "Found star using https://www.google.com/sky/"
    }
  }'
pause_script

echo "Enter the block hash"
read hash
echo "Get block by hash"
curl -v -X GET "http://localhost:8000/stars/hash:${hash}"
pause_script

echo "Get block by wallet address"
curl -v -X GET "http://localhost:8000/stars/address:${wallet_address}"
pause_script

echo "Get genesis block"
curl -v -X GET http://localhost:8000/block/0
pause_script

echo "Get the first block"
curl -v -X GET http://localhost:8000/block/1
pause_script

echo "Trying to get non-existing block"
curl -v -X GET http://localhost:8000/block/foobar
pause_script
