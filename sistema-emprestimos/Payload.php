<?php
class Payload {
    private $pixKey;
    private $description;
    private $merchantName;
    private $merchantCity;
    private $txid;
    private $amount;
    private $url;

    public function setPixKey($pixKey) {
        $this->pixKey = $pixKey;
        return $this;
    }

    public function setDescription($description) {
        $this->description = $description;
        return $this;
    }

    public function setMerchantName($merchantName) {
        $this->merchantName = $merchantName;
        return $this;
    }

    public function setMerchantCity($merchantCity) {
        $this->merchantCity = $merchantCity;
        return $this;
    }

    public function setTxid($txid) {
        $this->txid = $txid;
        return $this;
    }

    public function setAmount($amount) {
        $this->amount = number_format($amount, 2, '.', '');
        return $this;
    }

    public function setUrl($url) {
        $this->url = $url;
        return $this;
    }

    public function getPayload() {
        // Para PIX Dinâmico, usamos a URL do payload location
        if ($this->url) {
            return $this->generateDynamicPayload();
        } else {
            return $this->generateStaticPayload();
        }
    }

    private function generateDynamicPayload() {
        // Payload para QR Code Dinâmico (contém URL)
        $payload = [
            '00' => '01', // Payload Format Indicator
            '01' => '12', // Point of Initiation Method (12 = dinâmico)
        ];

        // Merchant Account Information
        $merchantInfo = [
            '00' => 'br.gov.bcb.pix',
            '01' => $this->url // URL do payload dinâmico
        ];

        $payload['26'] = $this->buildEMV($merchantInfo);
        $payload['52'] = '0000'; // Merchant Category Code
        $payload['53'] = '986'; // Transaction Currency (BRL)
        
        if ($this->amount) {
            $payload['54'] = $this->amount; // Transaction Amount
        }
        
        $payload['59'] = substr($this->merchantName, 0, 25); // Merchant Name
        $payload['60'] = substr($this->merchantCity, 0, 15); // Merchant City

        // Additional Data Field - TXID
        if ($this->txid) {
            $payload['62'] = $this->buildEMV(['05' => $this->txid]);
        }

        $payloadString = $this->buildPayloadString($payload);
        $crc = $this->calculateCRC16($payloadString);
        $payload['63'] = str_pad(strtoupper(dechex($crc)), 4, '0', STR_PAD_LEFT);

        return $this->buildPayloadString($payload);
    }

    private function generateStaticPayload() {
        // Payload para PIX Copia e Cola estático (mais compatível)
        $payload = [
            '00' => '01', // Payload Format Indicator
            '01' => '11', // Point of Initiation Method (11 = estático)
        ];

        // Merchant Account Information
        $merchantInfo = [
            '00' => 'br.gov.bcb.pix',
            '01' => $this->pixKey // Chave PIX diretamente
        ];

        $payload['26'] = $this->buildEMV($merchantInfo);
        $payload['52'] = '0000'; // Merchant Category Code
        $payload['53'] = '986'; // Transaction Currency (BRL)
        
        if ($this->amount) {
            $payload['54'] = $this->amount; // Transaction Amount
        }
        
        $payload['58'] = 'BR'; // Country Code
        $payload['59'] = substr($this->merchantName, 0, 25); // Merchant Name
        $payload['60'] = substr($this->merchantCity, 0, 15); // Merchant City
        
        if ($this->description) {
            $payload['62'] = $this->buildEMV(['05' => $this->description]);
        }

        $payloadString = $this->buildPayloadString($payload);
        $crc = $this->calculateCRC16($payloadString);
        $payload['63'] = str_pad(strtoupper(dechex($crc)), 4, '0', STR_PAD_LEFT);

        return $this->buildPayloadString($payload);
    }

    private function buildEMV($data) {
        $emv = '';
        foreach ($data as $id => $value) {
            $length = str_pad(strlen($value), 2, '0', STR_PAD_LEFT);
            $emv .= $id . $length . $value;
        }
        return $emv;
    }

    private function buildPayloadString($payload) {
        $string = '';
        foreach ($payload as $id => $value) {
            $length = str_pad(strlen($value), 2, '0', STR_PAD_LEFT);
            $string .= $id . $length . $value;
        }
        return $string;
    }

    private function calculateCRC16($data) {
        $crc = 0xFFFF;
        for ($i = 0; $i < strlen($data); $i++) {
            $crc ^= ord($data[$i]) << 8;
            for ($j = 0; $j < 8; $j++) {
                if ($crc & 0x8000) {
                    $crc = ($crc << 1) ^ 0x1021;
                } else {
                    $crc <<= 1;
                }
            }
        }
        return $crc & 0xFFFF;
    }
}
?>