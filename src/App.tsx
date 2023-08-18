import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import Header from './header';
import Footer from './footer';

import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  Snackbar,
  Alert,
  Link,
  Typography,
  Box,
  Divider
} from "@mui/material";
import {
  Scrypt,
  ScryptProvider,
  SensiletSigner,
  ContractCalledEvent,
  ByteString,
} from "scrypt-ts";
import { Voting } from "./contracts/voting";


// `npm run deploycontract` to get deployment transaction id
const contract_id = {
  /** The deployment transaction id */
  txId: "211a30f1d845c55ab2b7e8bfd2bb7a81ff3e3198eb3c8bd3571b85917935b901",
  /** The output index */
  outputIndex: 0,
};

function byteString2utf8(b: ByteString) {
  return Buffer.from(b, "hex").toString("utf8");
}

function App() {
  const [votingContract, setContract] = useState<Voting>();
  const signerRef = useRef<SensiletSigner>();
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState<{
    txId: string;
    candidate: string;
  }>({
    txId: "5889e7d552a1461de109a3075beb5f7dd55d3f7a6a62fb8885d3294cf33d8856",
    candidate: "",
  });

  async function fetchContract() {
    try {
      const instance = await Scrypt.contractApi.getLatestInstance(
        Voting,
        contract_id
      );
      setContract(instance);
    } catch (error: any) {
      console.error("fetchContract error: ", error);
      setError(error.message);
    }
  }

  useEffect(() => {
    const provider = new ScryptProvider();
    const signer = new SensiletSigner(provider);

    signerRef.current = signer;

    fetchContract();

    const subscription = Scrypt.contractApi.subscribe(
      {
        clazz: Voting,
        id: contract_id,
      },
      (event: ContractCalledEvent<Voting>) => {
        setSuccess({
          txId: event.tx.id,
          candidate: event.args[0] as ByteString,
        });
        setContract(event.nexts[0]);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleClose = (
    _event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setError("");
  };

  const handleSuccessClose = (
    _event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSuccess({
      txId: "",
      candidate: "",
    });
  };

  async function voting(e: any) {
    handleSuccessClose(e);
    const signer = signerRef.current as SensiletSigner;

    if (votingContract && signer) {
      const { isAuthenticated, error } = await signer.requestAuth();
      if (!isAuthenticated) {
        throw new Error(error);
      }

      await votingContract.connect(signer);

      // create the next instance from the current
      const nextInstance = votingContract.next();

      const candidateName = e.target.name;

      // update state
      nextInstance.increaseVotesReceived(candidateName);

      // call the method of current instance to apply the updates on chain
      votingContract.methods
        .vote(candidateName, {
          next: {
            instance: nextInstance,
            balance: votingContract.balance,
          },
        })
        .then((result) => {
          console.log(`Voting call tx: ${result.tx.id}`);
        })
        .catch((e) => {
          setError(e.message);
          fetchContract();
          console.error("call error: ", e);
        });
    }
  }

  return (
    <div className="App">
          <Header />
      <header className="App-header">
        <h2>Who Should be the Next CEO of Twitter ?</h2>
      </header>
      <TableContainer
        component={Paper}
        variant="outlined"
        style={{ width: 1200, height: "80vh", margin: "auto" }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell  align="center"><div className="name-style">Elon Musk</div></TableCell>
              <TableCell  align="center"><div className="name-style">Mark Zuckerburg</div></TableCell>
            </TableRow> 
          </TableHead>
          <TableBody>
            <TableRow>
            <TableCell align="center">
                <Box>
                  <Box
                    sx={{
                      height: 200,
                    }}
                    component="img"
                    alt={"Elon Musk"}
                    src={`${process.env.PUBLIC_URL}/${"ELON_voting_option"}.png`}
                  />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box>
                  <Box
                    sx={{
                      height: 200,
                    }}
                    component="img"
                    alt={"Mark Zuckerburg"}
                    src={`${process.env.PUBLIC_URL}/${"Mark_4"}.png`}
                  />
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center">
                <Box>
                  <Typography variant={"h1"} >
                    {votingContract?.candidates[0].votesReceived.toString()}
                  </Typography>
                  <Button
                      variant="contained"
                      style={{
                      backgroundColor: 'black',
                      color: 'gold',
                      borderColor: 'gold',
                      }}
                      onClick={voting}
                      name={votingContract?.candidates[0].name}
                      >
                      Vote
                    </Button>

                </Box>
              </TableCell>

              <TableCell align="center">
              <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant={"h1"}>
                    {votingContract?.candidates[1].votesReceived.toString()}
                  </Typography>
                  <Button
                      variant="contained"
                      style={{
                      backgroundColor: 'black',
                      color: 'gold',
                      borderColor: 'gold',
                      }}
                      onClick={voting}
                      name={votingContract?.candidates[1].name}
                      >
                      Vote
                    </Button>
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={error !== ""}
        autoHideDuration={6000}
        onClose={handleClose}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>

      <Snackbar
        open={success.candidate !== "" && success.txId !== ""}
        autoHideDuration={6000}
        onClose={handleSuccessClose}
      >
        <Alert severity="success">
          {" "}
          <Link
            href={`https://test.whatsonchain.com/tx/${success.txId}`}
            target="_blank"
            rel="noreferrer"
          >
            {`"${byteString2utf8(success.candidate)}" got one vote,  tx: ${
              success.txId
            }`}
          </Link>
        </Alert>
      </Snackbar>
    <Footer />
    </div>

  );
}

export default App;
